/**
 * @vitest-environment happy-dom
 */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSummary = vi.fn();

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ activeSchoolId: 1 }),
}));

vi.mock('../api/family-finance-api', () => ({
  getStudentFamilyFinanceSummary: (...args: unknown[]) => getSummary(...args),
}));

import {
  useStudentFamilyFinanceSummary,
  type FamilyFinanceResourceState,
} from '../hooks/use-student-family-finance';
import type { FamilyFinanceSummary } from '@/types/family-finance';

function HookProbe({
  studentId,
  refreshSignal,
  onState,
}: {
  studentId: number;
  refreshSignal: number;
  onState: (state: FamilyFinanceResourceState<FamilyFinanceSummary>) => void;
}) {
  const state = useStudentFamilyFinanceSummary(studentId, true, refreshSignal);
  onState(state);
  return (
    <div
      data-testid="family-finance-hook"
      data-initial-loading={state.initialLoading ? 'true' : undefined}
      data-fetching={state.fetching ? 'true' : undefined}
      data-has-data={state.data ? 'true' : undefined}
      data-has-error={state.error ? 'true' : undefined}
      data-display-name={state.data?.display_name ?? ''}
    />
  );
}

function summaryPayload(name: string) {
  return {
    family_id: 10,
    billing_partner_id: 10,
    display_name: name,
    billing_partner_name: name,
    currency: 'MAD',
    student_count: 1,
    total_net_due: 100,
    total_paid: 40,
    total_remaining: 60,
    total_overdue: 0,
    credit_balance: 0,
    unallocated_amount: 0,
    children: [
      {
        student_id: 7,
        student_name: 'يوسف',
        total_net_due: 100,
        total_paid: 40,
        total_remaining: 60,
        total_overdue: 0,
        services_summary: [],
      },
    ],
  };
}

describe('useStudentFamilyFinanceSummary refetch behavior', () => {
  beforeEach(() => {
    getSummary.mockReset();
  });

  afterEach(() => cleanup());

  it('keeps previous data during refetch (no empty flash)', async () => {
    let resolveSecond: ((value: unknown) => void) | null = null;
    getSummary
      .mockResolvedValueOnce({ success: true, data: summaryPayload('أسرة أ') })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const { rerender } = render(
      <HookProbe studentId={7} refreshSignal={0} onState={() => undefined} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('family-finance-hook').getAttribute('data-has-data')).toBe(
        'true',
      );
    });
    expect(screen.getByTestId('family-finance-hook').getAttribute('data-display-name')).toBe(
      'أسرة أ',
    );
    expect(screen.getByTestId('family-finance-hook').getAttribute('data-initial-loading')).toBeNull();

    rerender(<HookProbe studentId={7} refreshSignal={1} onState={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByTestId('family-finance-hook').getAttribute('data-fetching')).toBe(
        'true',
      );
    });
    expect(screen.getByTestId('family-finance-hook').getAttribute('data-has-data')).toBe('true');
    expect(screen.getByTestId('family-finance-hook').getAttribute('data-display-name')).toBe(
      'أسرة أ',
    );
    expect(screen.getByTestId('family-finance-hook').getAttribute('data-initial-loading')).toBeNull();

    await act(async () => {
      resolveSecond?.({ success: true, data: summaryPayload('أسرة ب') });
    });

    await waitFor(() => {
      expect(screen.getByTestId('family-finance-hook').getAttribute('data-display-name')).toBe(
        'أسرة ب',
      );
    });
    expect(screen.getByTestId('family-finance-hook').getAttribute('data-fetching')).toBeNull();
  });

  it('keeps previous data when refetch fails', async () => {
    getSummary
      .mockResolvedValueOnce({ success: true, data: summaryPayload('أسرة أ') })
      .mockResolvedValueOnce({
        success: false,
        error: { code: 'network_error', message: 'Network error' },
      });

    const { rerender } = render(
      <HookProbe studentId={7} refreshSignal={0} onState={() => undefined} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('family-finance-hook').getAttribute('data-display-name')).toBe(
        'أسرة أ',
      );
    });

    rerender(<HookProbe studentId={7} refreshSignal={1} onState={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByTestId('family-finance-hook').getAttribute('data-has-error')).toBe(
        'true',
      );
    });
    expect(screen.getByTestId('family-finance-hook').getAttribute('data-has-data')).toBe('true');
    expect(screen.getByTestId('family-finance-hook').getAttribute('data-display-name')).toBe(
      'أسرة أ',
    );
  });
});
