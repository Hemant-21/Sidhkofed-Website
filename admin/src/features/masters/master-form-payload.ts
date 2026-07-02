/**
 * Payload builders and Zod schemas for the master form dialog.
 * Extracted here so they can be unit-tested independently of the React component.
 */
import { z } from 'zod';
import type { MasterPayload } from './types';

// ── Default form (name_en / name_hi / display_order) ─────────────────────────

export const defaultMasterSchema = z.object({
  name_en: z.string().trim().min(1, 'English name is required.').max(150),
  name_hi: z.string().max(150).optional(),
  display_order: z.string().optional(),
});
export type DefaultMasterValues = z.infer<typeof defaultMasterSchema>;

export function emptyDefaultMasterForm(): DefaultMasterValues {
  return { name_en: '', name_hi: '', display_order: '' };
}

export function buildDefaultMasterPayload(values: DefaultMasterValues): MasterPayload {
  return {
    name_en: values.name_en,
    name_hi: values.name_hi?.trim() || null,
    display_order: values.display_order?.trim() ? Number(values.display_order) : null,
  };
}

// ── Financial Year form (label / start_date / end_date) ───────────────────────

export const financialYearSchema = z
  .object({
    label: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, 'Format must be YYYY-YYYY, e.g. 2025-2026.'),
    start_date: z.string().min(1, 'Start date is required.'),
    end_date: z.string().min(1, 'End date is required.'),
  })
  .superRefine((v, ctx) => {
    if (v.start_date && v.end_date && v.end_date < v.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_date'],
        message: 'Must be on or after start date.',
      });
    }
  });
export type FinancialYearValues = z.infer<typeof financialYearSchema>;

export function emptyFinancialYearForm(): FinancialYearValues {
  return { label: '', start_date: '', end_date: '' };
}

export function buildFinancialYearPayload(values: FinancialYearValues): {
  label: string;
  start_date: string;
  end_date: string;
} {
  return { label: values.label, start_date: values.start_date, end_date: values.end_date };
}
