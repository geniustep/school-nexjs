/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  preview: vi.fn(),
  confirm: vi.fn(),
  successToast: vi.fn(),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) => {
    if (!params) return key;
    return `${key}:${JSON.stringify(params)}`;
  },
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    success: mocks.successToast,
    error: vi.fn(),
    warning: vi.fn(),
    show: vi.fn(),
  }),
}));

vi.mock('@/features/admin/academic-setup/components/setup-drawer', () => ({
  SetupDrawer: ({ open, title, children, footer }: { open: boolean; title: string; children: React.ReactNode; footer?: React.ReactNode }) =>
    open ? <div aria-label={title}>{children}{footer}</div> : null,
}));

vi.mock('@/components/ui/confirmation-dialog', () => ({
  ConfirmationDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => void | Promise<void> }) =>
    open ? <button type="button" onClick={() => void onConfirm()}>dialog-confirm</button> : null,
}));

vi.mock('@/features/admin/finance/finance-money', () => ({
  FinanceMoney: ({ amount }: { amount?: number | null }) => <span>{String(amount ?? 0)}</span>,
}));

vi.mock('../api/student-departure-api', () => ({
  previewStudentDeparture: mocks.preview,
  confirmStudentDeparture: mocks.confirm,
}));

import { StudentDepartureDrawer } from './student-departure-drawer';

function previewData(options?: { canConfirm?: boolean; allowed?: string[] }) {
  return {
    preview_only: true,
    can_confirm: options?.canConfirm ?? false,
    student: { id: 42, name: 'Student', state: 'active', active: true, current_class_id: 7 },
    enrollment: { id: 9, state: 'active', class_id: 7, academic_year_id: 4, date_start: '2026-09-01' },
    decision: {
      student_id: 42,
      departure_type: 'withdrawn',
      last_day: '2026-09-15',
      reason: 'reason',
      note: null,
      destination_school: null,
      financial_policy: null,
    },
    academic_impact: {
      enrollment_id: 9,
      enrollment_state_after: 'withdrawn',
      date_end: '2026-09-15',
      class_id_preserved: 7,
      student_state_after: 'withdrawn',
      student_active_remains: true,
    },
    class_impact: {
      historical_class_id: 7,
      clear_current_class_id: true,
      current_class_id_before: 7,
    },
    service_impact: { recurring_to_end: [], preserve: [], already_closed: [], unsafe: [] },
    finance_impact: {
      has_agreement: true,
      current_agreement: { id: 11, currency: 'MAD' },
      current_period_amount: 1000,
      remaining: 2000,
      credit_balance: 0,
      future_installments: [],
      locked_future_installments: [],
      policy_details: {},
      selected_policy: null,
    },
    allowed_financial_policies: options?.allowed ?? ['FULL_CURRENT_PERIOD', 'KEEP_CURRENT_STATE_STOP_NEXT_PERIOD'],
    warnings: [],
    blocking_reasons: options?.canConfirm ? [] : [{ code: 'financial_policy_required', message: 'policy required' }],
    preview_fingerprint: 'fingerprint-1',
    preview_token: 'fingerprint-1',
  };
}

function fillCore() {
  fireEvent.change(screen.getByLabelText('admin.student360.departure.type'), {
    target: { value: 'withdrawn' },
  });
  fireEvent.change(screen.getByLabelText('admin.student360.departure.lastDay'), {
    target: { value: '2026-09-15' },
  });
  fireEvent.change(screen.getByLabelText('admin.student360.departure.reason'), {
    target: { value: 'reason' },
  });
}

describe('StudentDepartureDrawer', () => {
  beforeEach(() => {
    mocks.preview.mockReset();
    mocks.confirm.mockReset();
    mocks.successToast.mockReset();
  });

  afterEach(() => cleanup());

  it('starts with no silent financial-policy default and lets backend decide policy availability', async () => {
    mocks.preview.mockResolvedValue({ success: true, data: previewData() });
    render(<StudentDepartureDrawer open studentId={42} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const full = screen.getByLabelText('admin.student360.departure.policy.full') as HTMLInputElement;
    const prorate = screen.getByLabelText('admin.student360.departure.policy.prorate') as HTMLInputElement;
    const keep = screen.getByLabelText('admin.student360.departure.policy.keep') as HTMLInputElement;
    expect(full.checked).toBe(false);
    expect(prorate.checked).toBe(false);
    expect(keep.checked).toBe(false);

    fillCore();
    fireEvent.click(screen.getByRole('button', { name: 'admin.student360.departure.preview' }));

    await waitFor(() => expect(mocks.preview).toHaveBeenCalledTimes(1));
    expect(mocks.preview.mock.calls[0][1]).toMatchObject({
      departure_type: 'withdrawn',
      last_day: '2026-09-15',
      reason: 'reason',
      financial_policy: null,
    });
    await waitFor(() => expect(prorate.disabled).toBe(true));
    expect(full.disabled).toBe(false);
    expect(keep.disabled).toBe(false);
  });

  it('invalidates confirmation when backend reports a stale preview', async () => {
    mocks.preview.mockResolvedValue({
      success: true,
      data: previewData({
        canConfirm: true,
        allowed: [
          'FULL_CURRENT_PERIOD',
          'PRORATE_TO_DEPARTURE_DATE',
          'KEEP_CURRENT_STATE_STOP_NEXT_PERIOD',
        ],
      }),
    });
    mocks.confirm.mockResolvedValue({
      success: false,
      error: { code: 'preview_stale', message: 'stale', details: { status: 409 } },
      meta: {},
    });

    render(<StudentDepartureDrawer open studentId={42} onClose={vi.fn()} onSuccess={vi.fn()} />);
    fillCore();
    fireEvent.click(screen.getByLabelText('admin.student360.departure.policy.full'));
    fireEvent.click(screen.getByRole('button', { name: 'admin.student360.departure.preview' }));
    await waitFor(() => expect(mocks.preview).toHaveBeenCalledTimes(1));

    const confirmButton = screen.getByRole('button', { name: 'admin.student360.departure.confirm' }) as HTMLButtonElement;
    await waitFor(() => expect(confirmButton.disabled).toBe(false));
    fireEvent.click(confirmButton);
    fireEvent.click(await screen.findByRole('button', { name: 'dialog-confirm' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('admin.student360.departure.previewStale')).toBeTruthy();
    expect(confirmButton.disabled).toBe(true);
  });
});
