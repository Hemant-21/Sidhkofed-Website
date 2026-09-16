ALTER TABLE "financial_years" ADD COLUMN "is_all_years_aggregate" BOOLEAN NOT NULL DEFAULT false;

-- Synthetic FY row for "All financial years combined". Its date range spans every plausible FY so
-- the existing per-FY report queries aggregate across all years unchanged.
INSERT INTO "financial_years" (id, label, start_date, end_date, is_active, is_all_years_aggregate, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-00000000a11e', 'All Financial Years', '2000-01-01', '2099-12-31', true, true, now(), now())
ON CONFLICT (label) DO NOTHING;
