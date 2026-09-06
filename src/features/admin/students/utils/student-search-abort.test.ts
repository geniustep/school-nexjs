import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeStudentSearchQuery } from './student-search-query';

const getMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

describe('student search request cancellation', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('forwards AbortSignal and resolves aborted work as stale, not error', async () => {
    const controller = new AbortController();

    getMock.mockImplementationOnce(
      (_path: unknown, _query: unknown, options?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener(
            'abort',
            () => reject(new Error('aborted')),
            { once: true },
          );
        }),
    );

    const promise = executeStudentSearchQuery('ab', 5, 1, () => 1, controller.signal);

    expect(getMock).toHaveBeenCalledWith(
      '/admin/students',
      {
        search: 'ab',
        page: 1,
        page_size: 10,
        active_school_id: 5,
      },
      { signal: controller.signal },
    );

    controller.abort();

    await expect(promise).resolves.toEqual({ kind: 'stale' });
  });
});
