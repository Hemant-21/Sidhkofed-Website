import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/providers/toast-provider';
import { useBulkAction } from './use-bulk-action';

function Wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('useBulkAction', () => {
  it('settles every id and reports the success/failure breakdown', async () => {
    const action = vi.fn((id: string) =>
      id === 'bad' ? Promise.reject(new Error('nope')) : Promise.resolve(id),
    );
    const { result } = renderHook(() => useBulkAction({ verb: 'Published' }), { wrapper: Wrapper });

    let outcome: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      outcome = await result.current.run(['a', 'bad', 'c'], action);
    });

    expect(action).toHaveBeenCalledTimes(3);
    expect(outcome?.total).toBe(3);
    expect(outcome?.succeeded).toEqual(['a', 'c']);
    expect(outcome?.failed).toHaveLength(1);
    expect(outcome?.failed[0]?.id).toBe('bad');
    expect(result.current.isRunning).toBe(false);
  });

  it('no-ops on an empty selection', async () => {
    const action = vi.fn();
    const { result } = renderHook(() => useBulkAction(), { wrapper: Wrapper });
    let outcome: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      outcome = await result.current.run([], action);
    });
    expect(action).not.toHaveBeenCalled();
    expect(outcome).toEqual({ total: 0, succeeded: [], failed: [] });
  });
});
