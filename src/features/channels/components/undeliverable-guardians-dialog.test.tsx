// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
const sessionState = { activeSchoolId: 1 as number | null };

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({
    get activeSchoolId() {
      return sessionState.activeSchoolId;
    },
  }),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { UndeliverableGuardiansDialog } from './undeliverable-guardians-dialog';
import type { AdminChannel } from '@/types/admin-channel';

const channel = {
  id: 31,
  name: 'أسر',
  type: 'class_family',
  channel_type: 'class_family',
} as AdminChannel;

describe('UndeliverableGuardiansDialog', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    sessionState.activeSchoolId = 1;
  });

  it('loads on open and supports statuses, empty, retry, and pagination', async () => {
    const user = userEvent.setup();
    getMock
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            guardian: { id: 1, name: 'ولي أ' },
            students: [{ id: 10, name: 'تلميذ أ', class: { id: 5, name: '4A' } }],
            reason_code: 'inactive_user',
            account_status: 'inactive',
          },
          {
            guardian: { id: 2, name: 'ولي ب' },
            students: [{ id: 11, name: 'تلميذ ب', class: { id: 5, name: '4A' } }],
            reason_code: 'inactive_guardian',
            account_status: 'guardian_inactive',
          },
        ],
        meta: { pagination: { page: 1, page_size: 50, total: 51, total_pages: 2 } },
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            guardian: { id: 3, name: 'ولي ج' },
            students: [{ id: 12, name: 'تلميذ ج', class: { id: 6, name: '5B' } }],
            reason_code: 'missing_portal_user',
            account_status: 'no_account',
          },
        ],
        meta: { pagination: { page: 2, page_size: 50, total: 51, total_pages: 2 } },
      });

    const { rerender } = render(
      <UndeliverableGuardiansDialog open channel={channel} onClose={vi.fn()} />,
    );

    await waitFor(() => expect(screen.getByTestId('undeliverable-guardian-1')).toBeTruthy());
    expect(screen.getByText('channels.audience.undeliverable.statuses.inactive')).toBeTruthy();
    expect(
      screen.getByText('channels.audience.undeliverable.statuses.guardianInactive'),
    ).toBeTruthy();
    expect(getMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'channels.audience.undeliverable.loadMore' }));
    await waitFor(() => expect(screen.getByTestId('undeliverable-guardian-3')).toBeTruthy());
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(getMock.mock.calls[1]?.[1]).toMatchObject({ page: 2, page_size: 50 });

    getMock.mockResolvedValueOnce({
      success: false,
      error: { code: 'validation_error', message: 'nope', details: { status: 422 } },
      meta: {},
    });
    rerender(<UndeliverableGuardiansDialog open channel={{ ...channel, id: 99 }} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText('channels.audience.undeliverable.errors.unsupported')).toBeTruthy(),
    );

    getMock.mockResolvedValueOnce({ success: true, data: [], meta: {} });
    await user.click(screen.getByRole('button', { name: 'channels.audience.undeliverable.retry' }));
    await waitFor(() =>
      expect(screen.getByText('channels.audience.undeliverable.empty')).toBeTruthy(),
    );
  });

  it('does not request when closed', () => {
    render(<UndeliverableGuardiansDialog open={false} channel={channel} onClose={vi.fn()} />);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('ignores stale response after school change', async () => {
    let resolveFirst: ((value: unknown) => void) | null = null;
    getMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const { rerender } = render(
      <UndeliverableGuardiansDialog open channel={channel} onClose={vi.fn()} />,
    );
    expect(screen.getByText('channels.audience.undeliverable.loading')).toBeTruthy();

    sessionState.activeSchoolId = 2;
    getMock.mockResolvedValueOnce({ success: true, data: [], meta: {} });
    rerender(<UndeliverableGuardiansDialog open channel={channel} onClose={vi.fn()} />);

    resolveFirst?.({
      success: true,
      data: [
        {
          guardian: { id: 77, name: 'ولي مدرسة سابقة' },
          students: [],
          reason_code: 'missing_portal_user',
          account_status: 'no_account',
        },
      ],
      meta: {},
    });

    await waitFor(() =>
      expect(screen.getByText('channels.audience.undeliverable.empty')).toBeTruthy(),
    );
    expect(screen.queryByText('ولي مدرسة سابقة')).toBeNull();
  });
});
