/**
 * Malware-scanning seam (pre-Phase-5 audit, Issue 3).
 *
 * The previous stub returned `{ clean: true }` unconditionally — a FALSE clean result.
 * This module replaces it with an honest contract:
 *
 *   - Scanning disabled (`MALWARE_SCAN_ENABLED=false`): files are explicitly marked
 *     `unscanned` (never "clean"). Dev/single-node deployments may accept them, but the
 *     status is surfaced to the caller and the security log.
 *   - Scanning enabled but no real engine wired: the default scanner returns
 *     `unconfigured` — it can NEVER report clean — so the caller rejects/quarantines the
 *     upload instead of serving an unverified file.
 *   - A real engine (ClamAV, VirusTotal, a quarantine pipeline, …) is installed by
 *     assigning `activeScanner`; it returns `clean` / `infected`.
 */
import { logger } from '@/shared/logger';

export type ScanStatus = 'clean' | 'infected' | 'unscanned' | 'unconfigured' | 'error';

export interface ScanResult {
  status: ScanStatus;
  scanner: string;
}

/** Quarantine/scan hook. Real engines implement this and are set as `activeScanner`. */
export interface MalwareScanner {
  readonly name: string;
  scan(buffer: Buffer): Promise<ScanResult>;
}

export const securityLog = logger.child({ component: 'media-security' });

/**
 * Default engine used when scanning is enabled but nothing real is configured. It refuses
 * to vouch for a file: it returns `unconfigured`, never `clean`.
 */
class UnconfiguredScanner implements MalwareScanner {
  readonly name = 'unconfigured';
  async scan(): Promise<ScanResult> {
    return { status: 'unconfigured', scanner: this.name };
  }
}

/** The active scanner. Swap this for a real engine during infra wiring. */
export let activeScanner: MalwareScanner = new UnconfiguredScanner();

/** Test/infra seam to install a real scanner. */
export function setMalwareScanner(scanner: MalwareScanner): void {
  activeScanner = scanner;
}

/**
 * Run the configured scan policy. Returns the honest status; the caller decides whether to
 * accept (`unscanned` in dev), reject (`infected`/`unconfigured`), or fail (`error`).
 */
export async function runMalwareScan(buffer: Buffer, options: { enabled: boolean }): Promise<ScanResult> {
  if (!options.enabled) return { status: 'unscanned', scanner: 'disabled' };
  try {
    return await activeScanner.scan(buffer);
  } catch (err) {
    securityLog.error({ err, scanner: activeScanner.name }, 'Malware scan errored');
    return { status: 'error', scanner: activeScanner.name };
  }
}
