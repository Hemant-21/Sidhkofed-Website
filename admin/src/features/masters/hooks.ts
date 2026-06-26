'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/api/server-errors';
import type { ListQuery } from '@/types/api';
import type { MasterPayload } from './types';
import {
  listMasters,
  getMaster,
  createMaster,
  updateMaster,
  activateMaster,
  deactivateMaster,
} from './api';

const masterKey = (key: string, id?: string) =>
  id ? ['masters', key, id] : ['masters', key];

export function useMasterList(key: string, query?: ListQuery, enabled = true) {
  return useQuery({
    queryKey: [...masterKey(key), 'list', query ?? {}],
    queryFn: () => listMasters(key, query),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useMasterDetail(key: string, id: string, enabled = true) {
  return useQuery({
    queryKey: masterKey(key, id),
    queryFn: () => getMaster(key, id),
    enabled: enabled && Boolean(id),
  });
}

export function useCreateMaster(key: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: MasterPayload) => createMaster(key, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: masterKey(key) });
      void qc.invalidateQueries({ queryKey: ['master', key] });
      toast.success('Master record created.');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}

export function useUpdateMaster(key: string, id: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: Partial<MasterPayload>) => updateMaster(key, id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: masterKey(key) });
      void qc.invalidateQueries({ queryKey: ['master', key] });
      toast.success('Master record updated.');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}

export function useActivateMaster(key: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => activateMaster(key, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: masterKey(key) });
      void qc.invalidateQueries({ queryKey: ['master', key] });
      toast.success('Activated.');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}

export function useDeactivateMaster(key: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => deactivateMaster(key, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: masterKey(key) });
      void qc.invalidateQueries({ queryKey: ['master', key] });
      toast.success('Deactivated.');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}
