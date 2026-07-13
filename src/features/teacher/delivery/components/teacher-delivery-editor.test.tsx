// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fetchTeacherActualDelivery = vi.fn();
const updateActualDelivery = vi.fn();
const confirmActualDelivery = vi.fn();
const createActualDeliveryCorrection = vi.fn();
const voidActualDelivery = vi.fn();
const push = vi.fn();

vi.mock('@/features/i18n/locale-context', () => ({ useT: () => (key: string) => key }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/features/teacher/delivery/api/teacher-delivery-api', () => ({
  fetchTeacherActualDelivery: (...a: unknown[]) => fetchTeacherActualDelivery(...a),
  updateActualDelivery: (...a: unknown[]) => updateActualDelivery(...a),
  confirmActualDelivery: (...a: unknown[]) => confirmActualDelivery(...a),
  createActualDeliveryCorrection: (...a: unknown[]) => createActualDeliveryCorrection(...a),
  voidActualDelivery: (...a: unknown[]) => voidActualDelivery(...a),
}));
vi.mock('@/features/teacher/delivery/components/delivery-activity-results-editor', () => ({
  DeliveryActivityResultsEditor: () => <div>activities-editor</div>,
}));
vi.mock('@/features/teacher/delivery/components/delivery-readiness-panel', () => ({
  DeliveryReadinessPanel: () => <div>readiness-panel</div>,
}));
vi.mock('@/components/ui/confirmation-dialog', () => ({
  ConfirmationDialog: ({ open, title, onConfirm, body }: any) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {body}
        <button type="button" onClick={onConfirm}>
          confirm-dialog
        </button>
      </div>
    ) : null,
}));
vi.mock('@/features/teacher/ui/teacher-primitives', () => ({
  TeacherPageHeader: ({ title }: any) => <h1>{title}</h1>,
  TeacherWorkspaceCard: ({ title, children }: any) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));
vi.mock('@/components/badges/workflow-badge', () => ({
  WorkflowBadge: ({ state }: any) => <span>workflow:{state}</span>,
}));
vi.mock('@/components/ui/primitives', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));
vi.mock('@/components/states/states', () => ({
  LoadingState: () => <p>loading</p>,
  ApiErrorView: ({ error }: any) => <p>error:{error?.message ?? 'err'}</p>,
}));
vi.mock('next/link', () => ({ default: ({ href, children }: any) => <a href={href}>{children}</a> }));

import { TeacherDeliveryEditor } from './teacher-delivery-editor';

const detail = (overrides: Record<string, unknown> = {}) => ({
  id: 5,
  state: 'draft',
  review_state: 'not_reviewed',
  revision_no: 1,
  teacher: { id: 1, name: 'Ada' },
  class: { id: 2, name: '6A' },
  subject: { id: 3, name: 'Math' },
  offering: { id: 4, name: 'Offering' },
  distribution: { id: 6, name: 'Dist' },
  planned_distribution_line: { id: 10, name: 'Unit 1' },
  delivered_distribution_line: { id: 10, name: 'Unit 1' },
  delivered_distribution_line_id: 10,
  planned_distribution_line_id: 10,
  delivered_title: 'Lesson A',
  content_summary: 'Summary',
  completion_state: 'completed',
  completion_percent: 100,
  deviation_type: 'none',
  activities: [],
  attachment_ids: [],
  blockers: [],
  warnings: [],
  readiness: { ready_for_confirmation: true, blockers: [], warnings: [] },
  allowed_actions: { edit: true, confirm: true, create_correction: true, void: true },
  occurrence: {
    id: 9,
    date: '2026-07-13',
    start_time: '09:00',
    end_time: '10:00',
    state: 'held',
    class: { id: 2, name: '6A' },
    subject: { id: 3, name: 'Math' },
    teacher: { id: 1, name: 'Ada' },
  },
  ...overrides,
});

describe('TeacherDeliveryEditor', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps draft editable and saves without contextual fields', async () => {
    fetchTeacherActualDelivery.mockResolvedValue({ success: true, data: detail() });
    updateActualDelivery.mockResolvedValue({ success: true, data: detail({ content_summary: 'Updated' }) });
    render(<TeacherDeliveryEditor deliveryId="5" />);
    expect(await screen.findByDisplayValue('Lesson A')).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue('Summary'), { target: { value: 'Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => expect(updateActualDelivery).toHaveBeenCalled());
    const payload = updateActualDelivery.mock.calls[0][1];
    expect(payload.content_summary).toBe('Updated');
    expect(payload).not.toHaveProperty('teacher');
    expect(payload).not.toHaveProperty('school');
    expect(payload).not.toHaveProperty('occurrence');
  });

  it('makes confirmed deliveries read-only and still allows correction/void actions', async () => {
    fetchTeacherActualDelivery.mockResolvedValue({
      success: true,
      data: detail({
        state: 'confirmed',
        allowed_actions: { confirm: false, edit: false, create_correction: true, void: true },
      }),
    });
    render(<TeacherDeliveryEditor deliveryId="5" />);
    expect(await screen.findByText('teacher.delivery.immutableNotice')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'common.save' })).toBeNull();
    expect(screen.getByRole('button', { name: 'teacher.delivery.createCorrection' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'teacher.delivery.void' })).toBeTruthy();
  });

  it('opens confirm dialog and does not optimistically flip state before refetch', async () => {
    fetchTeacherActualDelivery
      .mockResolvedValueOnce({ success: true, data: detail() })
      .mockResolvedValueOnce({
        success: true,
        data: detail({ state: 'confirmed', current_journal_entry_id: 77 }),
      });
    confirmActualDelivery.mockResolvedValue({
      success: true,
      data: detail({ state: 'confirmed', current_journal_entry_id: 77 }),
    });
    render(<TeacherDeliveryEditor deliveryId="5" />);
    await screen.findByRole('heading', { name: 'Lesson A' });
    fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('teacher.delivery.confirmEffects')).toBeTruthy();
    fireEvent.click(screen.getByText('confirm-dialog'));
    await waitFor(() => expect(confirmActualDelivery).toHaveBeenCalledWith('5'));
    await waitFor(() => expect(fetchTeacherActualDelivery).toHaveBeenCalledTimes(2));
  });
});
