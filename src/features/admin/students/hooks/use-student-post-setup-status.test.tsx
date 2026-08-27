// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api/client';
import { useStudentPostSetupStatus } from './use-student-post-setup-status';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

const pendingStatus = {
  id: 130,
  state: 'running',
  steps: [
    { key: 'class_assignment', status: 'completed', processed: true },
    { key: 'account', status: 'pending', processed: false },
    { key: 'financial_plan', status: 'pending', processed: false },
  ],
  progress: { completed_steps: 1, total_steps: 3, percent: 33 },
};

const completeStatus = {
  id: 130,
  state: 'completed_with_warning',
  steps: [
    { key: 'class_assignment', status: 'completed', processed: true },
    { key: 'account', status: 'completed', processed: true },
    { key: 'financial_plan', status: 'ambiguous', processed: true },
  ],
  progress: { completed_steps: 3, total_steps: 3, percent: 100 },
};

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useStudentPostSetupStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls the student post-setup endpoint until backend progress reaches 100%', async () => {
    const get = vi.mocked(api.get);
    get
      .mockResolvedValueOnce({ success: true, data: pendingStatus, meta: {} })
      .mockResolvedValueOnce({ success: true, data: completeStatus, meta: {} });

    const { result } = renderHook(() => useStudentPostSetupStatus('84', true));
    await flushAsyncWork();

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenLastCalledWith('/admin/students/84/post-registration-setup');
    expect(result.current.data?.progress?.percent).toBe(33);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(get).toHaveBeenCalledTimes(2);
    expect(result.current.data?.progress?.percent).toBe(100);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('allows an explicit retry after a transient API failure', async () => {
    const get = vi.mocked(api.get);
    get
      .mockResolvedValueOnce({
        success: false,
        error: { code: 'network_error', message: 'temporary', details: {} },
        meta: {},
      })
      .mockResolvedValueOnce({ success: true, data: completeStatus, meta: {} });

    const { result } = renderHook(() => useStudentPostSetupStatus('84', true));
    await flushAsyncWork();

    expect(result.current.error).toBe('temporary');

    act(() => {
      result.current.reload();
    });
    await flushAsyncWork();

    expect(get).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.data?.progress?.percent).toBe(100);
  });
});
