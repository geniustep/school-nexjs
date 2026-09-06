// @vitest-environment happy-dom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudentSearchQuery } from './use-student-search-query';

const mocks = vi.hoisted(() => ({
  activeSchoolId: 7 as number | null,
  executeStudentSearchQuery: vi.fn(),
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ activeSchoolId: mocks.activeSchoolId }),
}));

vi.mock('../utils/student-search-query', () => ({
  STUDENT_SEARCH_DEBOUNCE_MS: 150,
  shouldFetchStudentSearch: (query: string) => query.trim().length >= 2,
  executeStudentSearchQuery: (...args: unknown[]) => mocks.executeStudentSearchQuery(...args),
}));

beforeEach(() => {
  vi.useFakeTimers();
  mocks.activeSchoolId = 7;
  mocks.executeStudentSearchQuery.mockReset();
  mocks.executeStudentSearchQuery.mockImplementation(() => new Promise(() => {}));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useStudentSearchQuery cancellation', () => {
  it('waits 150ms for a changed query and aborts superseded requests', () => {
    const { rerender, unmount } = renderHook(
      ({ query }) => useStudentSearchQuery(query),
      { initialProps: { query: '' } },
    );

    rerender({ query: 'ab' });
    act(() => vi.advanceTimersByTime(149));
    expect(mocks.executeStudentSearchQuery).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(mocks.executeStudentSearchQuery).toHaveBeenCalledTimes(1);
    const firstSignal = mocks.executeStudentSearchQuery.mock.calls[0]?.[4] as AbortSignal;
    expect(firstSignal.aborted).toBe(false);

    rerender({ query: 'abc' });
    act(() => vi.advanceTimersByTime(150));

    expect(firstSignal.aborted).toBe(true);
    expect(mocks.executeStudentSearchQuery).toHaveBeenCalledTimes(2);
    const secondSignal = mocks.executeStudentSearchQuery.mock.calls[1]?.[4] as AbortSignal;
    expect(secondSignal.aborted).toBe(false);

    unmount();
    expect(secondSignal.aborted).toBe(true);
  });

  it('aborts and restarts the request when active school changes', () => {
    const { rerender, unmount } = renderHook(
      ({ query }) => useStudentSearchQuery(query),
      { initialProps: { query: 'ab' } },
    );

    expect(mocks.executeStudentSearchQuery).toHaveBeenCalledTimes(1);
    const firstSignal = mocks.executeStudentSearchQuery.mock.calls[0]?.[4] as AbortSignal;

    mocks.activeSchoolId = 9;
    rerender({ query: 'ab' });

    expect(firstSignal.aborted).toBe(true);
    expect(mocks.executeStudentSearchQuery).toHaveBeenCalledTimes(2);
    expect(mocks.executeStudentSearchQuery.mock.calls[1]?.[1]).toBe(9);

    const secondSignal = mocks.executeStudentSearchQuery.mock.calls[1]?.[4] as AbortSignal;
    unmount();
    expect(secondSignal.aborted).toBe(true);
  });
});
