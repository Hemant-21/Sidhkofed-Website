/**
 * Browser interaction helpers: clipboard + file download. SSR-safe (guard on
 * `window`). Used by reusable toolbars/actions, never by module logic.
 */

/** Copy text to the clipboard; resolves false on failure (no throw). */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Trigger a browser download of a Blob with a given filename. */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Open an external URL safely in a new tab (noopener,noreferrer — no token leak). */
export function openExternal(url: string): void {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}
