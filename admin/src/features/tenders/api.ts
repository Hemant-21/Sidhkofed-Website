'use client';

import { adminResource } from '@/constants/api-endpoints';
import { get } from '@/lib/api/http';
import type { TenderDetail } from './types';

export const TENDERS_RESOURCE = 'tenders';

export { TENDER_PERMS } from './permissions';

export const fetchTender = (id: string) =>
  get<TenderDetail>(adminResource(TENDERS_RESOURCE).detail(id));
