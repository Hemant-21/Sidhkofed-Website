/**
 * Distribution-item total-quantity rule (API spec §6 / schema Part 6). The single source of truth
 * for the auto-calculation, kept pure so it is trivially unit-tested:
 *
 *   total_quantity = quantity_per_unit * number_of_units_or_groups   (when manual_override = false)
 *   total_quantity = the supplied value                              (when manual_override = true)
 *
 * When auto and either operand is absent, the total is null (not enough information). The rule is
 * basis-agnostic: for `group`, units-or-groups counts groups; for `individual`, it counts units.
 */
import { Prisma } from '@prisma/client';

export interface DistributionItemCalcInput {
  manualOverride: boolean;
  totalQuantity: number | null;
  quantityPerUnit: number | null;
  numberOfUnitsOrGroups: number | null;
}

export function computeTotalQuantity(input: DistributionItemCalcInput): Prisma.Decimal | null {
  if (input.manualOverride) {
    return input.totalQuantity === null ? null : new Prisma.Decimal(input.totalQuantity);
  }
  if (input.quantityPerUnit === null || input.numberOfUnitsOrGroups === null) return null;
  return new Prisma.Decimal(input.quantityPerUnit).mul(input.numberOfUnitsOrGroups);
}
