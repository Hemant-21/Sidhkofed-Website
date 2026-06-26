/**
 * Pure helpers for the settings form (unit-testable; no React). The grouped settings API does not
 * expose each key's declared kind, so the editor infers the control from the value's runtime type
 * and coerces the edited string back to the original type before `PUT` — the backend's typed
 * catalog is the validation authority and rejects a bad value with 422.
 */

export type SettingKind = 'boolean' | 'number' | 'text';

/** Infer the editor control from a setting's current value. */
export function inferKind(value: unknown): SettingKind {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'text';
}

/** Render a value as the string shown in a text/number input. */
export function toInputString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

/**
 * Coerce an edited input string back to the value type the API expects, based on the original
 * value. Numbers parse as numbers; arrays/objects parse from JSON; empty text becomes null when the
 * original was null (nullable scalar). Booleans are edited via the switch, not this path.
 */
export function coerceValue(input: string, original: unknown): unknown {
  if (typeof original === 'number') {
    const n = Number(input);
    return Number.isNaN(n) ? input : n;
  }
  if (Array.isArray(original) || (original !== null && typeof original === 'object')) {
    try {
      return JSON.parse(input);
    } catch {
      return input;
    }
  }
  if (original === null && input.trim() === '') return null;
  return input;
}
