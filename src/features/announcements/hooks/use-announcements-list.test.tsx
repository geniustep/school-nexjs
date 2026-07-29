/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';

const listMock = vi.fn();
let activeRole = 'parent';
let studentId: number | undefined = 11;

vi.mock('@/features/announcements/api/announcements-api', () => ({
  fetchAnnouncementList: (...args: unknown[]) => listMock(...args),
}));

vi.mock('@/features/auth/active-role-context', () => ({
  useActiveRole: () => ({
    activeRole,
    availableRoles: [],
    showSwitcher: false,
    switching: false,
    error: null,
    clearError: () => undefined,
    switchRole: async () => false,
  }),
}));

import { useAnnouncementsList } from '@/features/announcements/hooks/use-announcements-list';

function Probe({
  onSnapshot,
}: {
  onSnapshot: (s: { studentId?: number; itemIds: number[]; unread: number }) => void;
}) {
  const state = useAnnouncementsList({ studentId });
  useEffect(() => {
    onSnapshot({
      studentId,
      itemIds: state.data?.items.map((i) => i.id) ?? [],
      unread: state.data?.unread_count ?? -1,
    });
  }, [state.data, onSnapshot]);
  return null;
}

describe('useAnnouncementsList context isolation', () => {
  beforeEach(() => {
    listMock.mockReset();
    activeRole = 'parent';
    studentId = 11;
  });

  afterEach(() => {
    cleanup();
  });

  it('clears previous child data when student_id changes and ignores stale responses', async () => {
    let resolveFirst: ((v: unknown) => void) | undefined;
    listMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    listMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [
          {
            id: 2,
            content_id: null,
            school_id: null,
            subject: 'child-22',
            priority: 'normal',
            is_pinned: false,
            expires_at: null,
            published_at: null,
            sent_date: null,
            is_read: true,
            sender: null,
          },
        ],
        page: 1,
        page_size: 20,
        total: 1,
        total_pages: 1,
        unread_count: 0,
      },
    });

    const snaps: Array<{ studentId?: number; itemIds: number[]; unread: number }> = [];
    const { rerender } = render(
      <Probe onSnapshot={(s) => snaps.push(s)} />,
    );

    studentId = 22;
    rerender(<Probe onSnapshot={(s) => snaps.push(s)} />);

    // Late response for child 11 must not win.
    expect(resolveFirst).toBeTypeOf('function');
    resolveFirst!({
      ok: true,
      data: {
        items: [
          {
            id: 1,
            content_id: null,
            school_id: null,
            subject: 'stale-child-11',
            priority: 'normal',
            is_pinned: false,
            expires_at: null,
            published_at: null,
            sent_date: null,
            is_read: false,
            sender: null,
          },
        ],
        page: 1,
        page_size: 20,
        total: 1,
        total_pages: 1,
        unread_count: 9,
      },
    });

    await waitFor(() => {
      expect(snaps.some((s) => s.itemIds.includes(2))).toBe(true);
    });
    expect(snaps.some((s) => s.itemIds.includes(1))).toBe(false);
    expect(listMock.mock.calls.some((c) => c[0]?.student_id === 22)).toBe(true);
  });
});
