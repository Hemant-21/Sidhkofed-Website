/** Unit tests — the controlled dynamic-field engine. Pure, DB-free. */
import { describe, it, expect } from 'vitest';
import { validateDynamicValues, type FieldDefinition } from './events.dynamic-fields';
import { ValidationError } from '@/shared/errors';

const defs: FieldDefinition[] = [
  { fieldKey: 'participant_count', labelEn: 'Participants', dataType: 'number', isRequired: true, options: null },
  { fieldKey: 'trainer_name', labelEn: 'Trainer', dataType: 'text', isRequired: false, options: null },
  { fieldKey: 'mode', labelEn: 'Mode', dataType: 'select', isRequired: false, options: ['online', 'offline'] },
  { fieldKey: 'is_residential', labelEn: 'Residential', dataType: 'boolean', isRequired: false, options: null },
  { fieldKey: 'visit_date', labelEn: 'Visit date', dataType: 'date', isRequired: false, options: null },
];

describe('validateDynamicValues', () => {
  it('accepts valid values and returns only known keys', () => {
    const out = validateDynamicValues(
      { participant_count: 45, trainer_name: 'A. Kumar', mode: 'offline', is_residential: true, visit_date: '2026-07-15' },
      defs,
    );
    expect(out).toEqual({ participant_count: 45, trainer_name: 'A. Kumar', mode: 'offline', is_residential: true, visit_date: '2026-07-15' });
  });

  it('rejects unknown keys', () => {
    expect(() => validateDynamicValues({ participant_count: 1, surprise: 'x' }, defs)).toThrow(ValidationError);
  });

  it('enforces required fields', () => {
    expect(() => validateDynamicValues({}, defs)).toThrow(ValidationError);
  });

  it('enforces declared data types', () => {
    expect(() => validateDynamicValues({ participant_count: 'lots' }, defs)).toThrow(ValidationError);
    expect(() => validateDynamicValues({ participant_count: 1, is_residential: 'yes' }, defs)).toThrow(ValidationError);
    expect(() => validateDynamicValues({ participant_count: 1, visit_date: '15-07-2026' }, defs)).toThrow(ValidationError);
  });

  it('constrains select to configured options', () => {
    expect(() => validateDynamicValues({ participant_count: 1, mode: 'hybrid' }, defs)).toThrow(ValidationError);
  });

  it('treats empty string / null as absent for optional fields', () => {
    const out = validateDynamicValues({ participant_count: 1, trainer_name: '' }, defs);
    expect(out).toEqual({ participant_count: 1 });
  });
});
