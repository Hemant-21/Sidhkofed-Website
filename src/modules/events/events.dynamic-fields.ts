/**
 * Dynamic-field engine (CMS requirements §4.1 "Conditional fields"; API spec §6).
 *
 * NOT a form builder: an event type defines a small, fixed set of typed fields
 * (`event_field_definitions`), and an event's `dynamic_values` JSONB is validated server-side
 * against the ACTIVE definitions for its type. Validation enforces:
 *   - allowed field keys only (reject unknown keys)
 *   - the declared data type (text/textarea/number/date/boolean/select)
 *   - required fields present (non-empty)
 *   - select values constrained to the configured options
 *
 * Approved data types are exactly the frozen `FieldDataType` enum
 * (text, textarea, number, date, boolean, select). Extended types (multi_select / reference /
 * file / datetime) are intentionally unsupported — adding them is a reviewed enum change
 * (development-rules §3). This module is pure (no DB, no HTTP) so it is trivially unit-testable;
 * the service supplies the active definitions it loads through the repository.
 */
import type { FieldDataType } from '@prisma/client';
import { ValidationError, type FieldErrors } from '@/shared/errors';

export interface FieldDefinition {
  fieldKey: string;
  labelEn: string;
  dataType: FieldDataType;
  isRequired: boolean;
  /** Allowed values for `select` (from the definition's `options` JSON). */
  options: string[] | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Coerce/validate a single value against its definition. Returns the normalized value. */
function validateValue(def: FieldDefinition, value: unknown, errors: FieldErrors): unknown {
  const field = `dynamic_values.${def.fieldKey}`;
  switch (def.dataType) {
    case 'text':
    case 'textarea': {
      if (typeof value !== 'string') {
        (errors[field] ??= []).push('Must be a string.');
        return value;
      }
      return value;
    }
    case 'number': {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        (errors[field] ??= []).push('Must be a number.');
      }
      return value;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') (errors[field] ??= []).push('Must be a boolean.');
      return value;
    }
    case 'date': {
      if (typeof value !== 'string' || !DATE_RE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
        (errors[field] ??= []).push('Must be a YYYY-MM-DD date.');
      }
      return value;
    }
    case 'select': {
      if (typeof value !== 'string') {
        (errors[field] ??= []).push('Must be one of the allowed options.');
        return value;
      }
      if (def.options && !def.options.includes(value)) {
        (errors[field] ??= []).push(`Must be one of: ${def.options.join(', ')}.`);
      }
      return value;
    }
    default:
      return value;
  }
}

/** Treat null/undefined/"" as absent (for required checks). */
function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Validate a `dynamic_values` object against the active field definitions for an event type.
 * Throws `ValidationError` (422) on any problem; returns the normalized object on success
 * (only known keys retained, so unexpected client keys never reach the database).
 */
export function validateDynamicValues(
  rawValues: Record<string, unknown> | null | undefined,
  definitions: FieldDefinition[],
): Record<string, unknown> {
  const values = rawValues ?? {};
  const errors: FieldErrors = {};
  const byKey = new Map(definitions.map((d) => [d.fieldKey, d]));

  // Reject unknown keys (controlled schema — not a free-form bag).
  for (const key of Object.keys(values)) {
    if (!byKey.has(key)) {
      (errors[`dynamic_values.${key}`] ??= []).push('Unknown field for this event type.');
    }
  }

  const normalized: Record<string, unknown> = {};
  for (const def of definitions) {
    const present = Object.prototype.hasOwnProperty.call(values, def.fieldKey);
    const value = present ? values[def.fieldKey] : undefined;
    if (isEmpty(value)) {
      if (def.isRequired) (errors[`dynamic_values.${def.fieldKey}`] ??= []).push('This field is required.');
      continue;
    }
    normalized[def.fieldKey] = validateValue(def, value, errors);
  }

  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  return normalized;
}
