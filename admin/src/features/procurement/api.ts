'use client';

import { adminResource } from '@/constants/api-endpoints';
import { get } from '@/lib/api/http';
import type { ProcurementDetail } from './types';

export const PROCUREMENT_RESOURCE = 'procurement-updates';

export { PROCUREMENT_PERMS } from './permissions';

export const fetchProcurement = (id: string) =>
  get<ProcurementDetail>(adminResource(PROCUREMENT_RESOURCE).detail(id));
