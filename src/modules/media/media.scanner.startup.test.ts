/** Unit tests — malware scanner startup hardening (remediation Issue 3). */
import { describe, it, expect, afterEach } from 'vitest';
import {
  verifyScannerStartup,
  setMalwareScanner,
  isScannerConfigured,
  type MalwareScanner,
  type ScanResult,
} from './media.scanner';

class FakeScanner implements MalwareScanner {
  constructor(
    readonly name: string,
    private readonly healthy: boolean,
  ) {}
  async scan(): Promise<ScanResult> {
    return { status: 'clean', scanner: this.name };
  }
  async healthCheck(): Promise<boolean> {
    return this.healthy;
  }
}

/** Reset to the default unconfigured scanner after each test. */
afterEach(() => setMalwareScanner({ name: 'unconfigured', async scan() { return { status: 'unconfigured', scanner: 'unconfigured' }; } }));

describe('verifyScannerStartup', () => {
  it('passes when scanning is disabled (any environment)', async () => {
    await expect(verifyScannerStartup({ enabled: false, isProduction: true })).resolves.toBeUndefined();
  });

  it('FAILS STARTUP in production when enabled but no engine is configured', async () => {
    await expect(verifyScannerStartup({ enabled: true, isProduction: true })).rejects.toThrow(/Refusing to start/);
  });

  it('warns (does not throw) in non-production when enabled but unconfigured', async () => {
    await expect(verifyScannerStartup({ enabled: true, isProduction: false })).resolves.toBeUndefined();
  });

  it('passes when a healthy engine is wired', async () => {
    setMalwareScanner(new FakeScanner('fake', true));
    expect(isScannerConfigured()).toBe(true);
    await expect(verifyScannerStartup({ enabled: true, isProduction: true })).resolves.toBeUndefined();
  });

  it('FAILS STARTUP in production when the engine health check fails', async () => {
    setMalwareScanner(new FakeScanner('fake', false));
    await expect(verifyScannerStartup({ enabled: true, isProduction: true })).rejects.toThrow(/Refusing to start/);
  });
});
