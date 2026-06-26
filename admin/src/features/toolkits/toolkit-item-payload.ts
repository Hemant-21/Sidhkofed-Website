/**
 * Pure form ↔ API mapping for a toolkit catalogue item (unit-testable; no React). The backend owns
 * any distribution totals — this only carries the catalogue DEFAULTS (basis, default quantity/group
 * size, unit). Numeric strings coerce to numbers (or null); a `group` basis requires a group size
 * (mirrored in the form schema and enforced by the backend).
 */

import type { ToolkitItem, ToolkitItemWriteInput, DistributionBasis } from './types';

export interface ToolkitItemFormValues {
  name_en: string;
  name_hi: string;
  description_en: string;
  description_hi: string;
  unit: string;
  distribution_basis: DistributionBasis;
  default_quantity_per_unit: string;
  default_group_size: string;
  is_active: boolean;
  display_order: string;
}

const blank = (v: string): string | null => (v.trim() === '' ? null : v.trim());
const num = (v: string): number | null => (v.trim() === '' ? null : Number(v));

/** Default values for a new item. `display_order` is supplied by the caller (append to the end). */
export function emptyToolkitItemForm(displayOrder = 0): ToolkitItemFormValues {
  return {
    name_en: '',
    name_hi: '',
    description_en: '',
    description_hi: '',
    unit: '',
    distribution_basis: 'individual',
    default_quantity_per_unit: '',
    default_group_size: '',
    is_active: true,
    display_order: String(displayOrder),
  };
}

/** Hydrate from an existing item (edit). */
export function toolkitItemToForm(i: ToolkitItem): ToolkitItemFormValues {
  return {
    name_en: i.name_en,
    name_hi: i.name_hi ?? '',
    description_en: i.description_en ?? '',
    description_hi: i.description_hi ?? '',
    unit: i.unit ?? '',
    distribution_basis: i.distribution_basis,
    default_quantity_per_unit: i.default_quantity_per_unit != null ? String(i.default_quantity_per_unit) : '',
    default_group_size: i.default_group_size != null ? String(i.default_group_size) : '',
    is_active: i.is_active,
    display_order: String(i.display_order),
  };
}

/** Convert form values → the API write payload. A non-group basis clears the group size. */
export function buildToolkitItemPayload(v: ToolkitItemFormValues): ToolkitItemWriteInput {
  const isGroup = v.distribution_basis === 'group';
  return {
    name_en: v.name_en.trim(),
    name_hi: blank(v.name_hi),
    description_en: blank(v.description_en),
    description_hi: blank(v.description_hi),
    unit: blank(v.unit),
    distribution_basis: v.distribution_basis,
    default_quantity_per_unit: num(v.default_quantity_per_unit),
    default_group_size: isGroup ? num(v.default_group_size) : null,
    is_active: v.is_active,
    display_order: v.display_order.trim() === '' ? 0 : Number(v.display_order),
  };
}
