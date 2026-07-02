'use client';

/**
 * Bounded master-data option hook (Phase 15.3). Master lists (event-types, districts,
 * blocks, commodities, training-types…) are small, slowly-changing reference sets, so the
 * dropdown loads them eagerly and maps to the shared {@link SelectOption} shape consumed by
 * `<SelectField>` / `<MultiSelectField>`.
 *
 * Masters use the authenticated admin master list which all CMS roles can view — codex §6:
 * deactivated values are surfaced as DISABLED, never silently dropped, so an already-linked
 * historical value still renders while staying unselectable for new entries.
 *
 * Large CONTENT relations (programmes/institutions/galleries/documents/events) are NOT loaded
 * here — they use the paginated, server-side {@link RelationPicker} (relation-search.ts) so the
 * client never requests `PAGE_SIZE_MAX` (Phase 15.3 remediation — Finding 4).
 */

import { useQuery } from '@tanstack/react-query';
import { MASTERS } from '@/constants/api-endpoints';
import { getList } from '@/lib/api/http';
import type { SelectOption } from '@/components/ui/select';
import { PAGE_SIZE_MAX } from '@/constants/app';

/** What every option hook returns. `options` is always defined (empty while loading). */
export interface OptionsResult {
  options: SelectOption[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

interface MasterRecord {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  is_active?: boolean;
  district_id?: string | null;
}

/**
 * Active-master options for a kebab-case master key (e.g. `event-types`, `commodities`).
 * Deactivated values are kept but disabled so historical links still display.
 * `districtId` filters blocks to a district (block list supports `district_id` — API spec §4).
 */
export function useMasterOptions(
  key: string,
  opts: { districtId?: string | null; enabled?: boolean } = {},
): OptionsResult {
  const { districtId, enabled = true } = opts;
  const query = useQuery({
    queryKey: ['master', key, { district_id: districtId ?? null }],
    queryFn: () =>
      getList<MasterRecord>(MASTERS.admin(key), {
        page_size: PAGE_SIZE_MAX,
        ordering: 'display_order',
        ...(districtId ? { district_id: districtId } : {}),
      }),
    enabled,
    staleTime: 5 * 60_000, // masters change rarely — cache aggressively
  });

  const options: SelectOption[] = (query.data?.items ?? []).map((m) => ({
    value: m.id,
    label: m.name_en,
    disabled: m.is_active === false,
  }));

  return { options, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
