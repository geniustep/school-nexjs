// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fetchDeliveryContext = vi.fn();
const createActualDelivery = vi.fn();
const replace = vi.fn();
const push = vi.fn();

vi.mock('@/features/i18n/locale-context', () => ({ useT: () => (key: string) => key }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
}));
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock('@/features/teacher/delivery/api/teacher-delivery-api', () => ({
  fetchDeliveryContext: (...args: unknown[]) => fetchDeliveryContext(...args),
  createActualDelivery: (...args: unknown[]) => createActualDelivery(...args),
}));
vi.mock('@/features/teacher/delivery/components/delivery-readiness-panel', () => ({
  DeliveryReadinessPanel: () => <div>readiness-panel</div>,
}));
vi.mock('@/components/badges/workflow-badge', () => ({
  WorkflowBadge: ({ state }: any) => <span>workflow:{state}</span>,
}));
vi.mock('@/components/states/states', () => ({
  LoadingState: () => <p>loading</p>,
  ApiErrorView: ({ error }: any) => <p>error:{error?.message ?? 'err'}</p>,
}));

import { DeliveryContextStep } from './delivery-context-step';

const context = (overrides: Record<string, unknown> = {}) => ({
  occurrence: {
    id: 9,
    date: '2026-07-13',
    start_time: '09:00',
    end_time: '10:00',
    state: 'held',
    class: { id: 1, name: '6A' },
    subject: { id: 2, name: 'Math' },
    teacher: { id: 3, name: 'Ada' },
  },
  assignment: { id: 8, name: 'Assign' },
  offering: { id: 7, name: 'Offering' },
  active_distribution: { id: 6, name: 'Dist' },
  current_jathatha: { id: 5, name: 'Jathatha' },
  planned_distribution_line: { id: 10, name: 'Unit 1', sequence_order: 1 },
  remaining_distribution_lines: [
    { id: 10, name: 'Unit 1', sequence_order: 1 },
    { id: 11, name: 'Unit 2', sequence_order: 2, completed: true },
  ],
  current_delivery: null,
  current_journal_entry: null,
  progress_summary: { coverage_percent: 20, summary: '20%' },
  readiness: { ready_for_confirmation: false, blockers: [], warnings: [] },
  blockers: [],
  warnings: [],
  allowed_actions: { create: true, create_delivery: true },
  ...overrides,
});

describe('DeliveryContextStep', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('redirects to existing current delivery instead of creating a duplicate', async () => {
    fetchDeliveryContext.mockResolvedValue({
      success: true,
      data: context({
        current_delivery: { id: 42, state: 'draft', review_state: 'not_reviewed', revision_no: 1, teacher: null, class: null, subject: null, offering: null },
      }),
    });
    render(<DeliveryContextStep occurrenceId="9" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/teacher/actual-deliveries/42'));
  });

  it('does not auto-select a delivered line and requires explicit choice', async () => {
    fetchDeliveryContext.mockResolvedValue({ success: true, data: context() });
    render(<DeliveryContextStep occurrenceId="9" />);
    expect(await screen.findByText('teacher.delivery.context')).toBeTruthy();
    const select = screen.getByLabelText('teacher.delivery.deliveredLine') as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(screen.getByText(/Unit 2/)).toBeTruthy();
    expect(screen.getByText('teacher.delivery.plannedLine')).toBeTruthy();
  });

  it('requires deviation reason when delivered line differs from planned', async () => {
    fetchDeliveryContext.mockResolvedValue({ success: true, data: context() });
    createActualDelivery.mockResolvedValue({
      success: true,
      data: { id: 99, state: 'draft', review_state: 'not_reviewed', revision_no: 1, teacher: null, class: null, subject: null, offering: null, activities: [], attachment_ids: [], blockers: [], warnings: [] },
    });
    render(<DeliveryContextStep occurrenceId="9" />);
    await screen.findByText('teacher.delivery.context');
    fireEvent.change(screen.getByLabelText('teacher.delivery.deliveredLine'), { target: { value: '11' } });
    expect(await screen.findByText('teacher.delivery.deviationWarning')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'teacher.delivery.createDraft' }));
    expect(createActualDelivery).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('teacher.delivery.deviationReason'), {
      target: { value: 'Support session needed' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'teacher.delivery.createDraft' }));
    await waitFor(() => expect(createActualDelivery).toHaveBeenCalled());
    const payload = createActualDelivery.mock.calls[0][0];
    expect(payload.delivered_distribution_line_id).toBe(11);
    expect(payload.deviation_type).not.toBe('none');
    expect(payload.deviation_reason).toBe('Support session needed');
  });

  it('creates draft with deviation none when same planned line is chosen', async () => {
    fetchDeliveryContext.mockResolvedValue({ success: true, data: context() });
    createActualDelivery.mockResolvedValue({
      success: true,
      data: { id: 100, state: 'draft', review_state: 'not_reviewed', revision_no: 1, teacher: null, class: null, subject: null, offering: null, activities: [], attachment_ids: [], blockers: [], warnings: [] },
    });
    render(<DeliveryContextStep occurrenceId="9" />);
    await screen.findByText('teacher.delivery.context');
    fireEvent.change(screen.getByLabelText('teacher.delivery.deliveredLine'), { target: { value: '10' } });
    expect(screen.queryByLabelText('teacher.delivery.deviationReason')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'teacher.delivery.createDraft' }));
    await waitFor(() => expect(createActualDelivery).toHaveBeenCalled());
    expect(createActualDelivery.mock.calls[0][0].deviation_type).toBe('none');
    expect(push).toHaveBeenCalledWith('/teacher/actual-deliveries/100');
  });
});
