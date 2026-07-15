// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { AdmissionDetail, AdmissionListItem } from '@/types/admission';
import { AdmissionChangeStatusDialog } from '../components/admission-change-status-dialog';
import { AdmissionPrimaryActionPanel } from '../components/admission-primary-action-panel';
import { AdmissionsBulkActionBar } from '../components/admissions-bulk-action-bar';
import { ADMISSION_TABS } from './admission-detail-tabs';
import { getAdmissionDecisionOptions } from './admission-decision-options';
import {
  canShowChangeStatusAction,
  intersectAllowedStatusTargets,
  normalizeAllowedStatusTargets,
} from './admission-modern-actions';
import { applicationStatusLabelKey } from './admission-modern-status';
import { validateChangeStatus } from './admission-action-validation';
import { presentationColumnDropStage } from './admission-kanban-presentation';
import { isRawKanbanDropTarget } from './admission-raw-kanban';

const executeAdmissionAction = vi.fn();
const executeAdmissionsBulkAction = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ activeSchoolId: 3 }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), show: vi.fn() }),
}));

vi.mock('../api/admissions-api', () => ({
  executeAdmissionAction: (...args: unknown[]) => executeAdmissionAction(...args),
  executeAdmissionsBulkAction: (...args: unknown[]) => executeAdmissionsBulkAction(...args),
}));

function detail(overrides: Partial<AdmissionDetail> = {}): AdmissionDetail {
  return {
    id: 77,
    student_name: 'ياسمين الاختبارية',
    state: 'accepted',
    allowed_actions: {},
    application_status: 'accepted',
    modern_allowed_actions: [{ code: 'change_status', allowed: true }],
    allowed_status_targets: [
      'new',
      'follow_up',
      'in_assessment',
      'decision_pending',
      'ready_for_registration',
      'waitlisted',
      'rejected',
      'closed',
    ],
    allowed_return_targets: ['new', 'follow_up', 'in_assessment', 'decision_pending'],
    primary_next_action: { code: 'log_contact' },
    ...overrides,
  } as AdmissionDetail;
}

function listItem(overrides: Partial<AdmissionListItem> = {}): AdmissionListItem {
  return {
    id: 1,
    student_name: 'أ',
    state: 'accepted',
    next_action: null,
    next_action_date: null,
    duplicate_count: 0,
    offer_state: null,
    assigned_user: null,
    priority: null,
    source: null,
    requested_level: null,
    guardian_name: null,
    guardian_phone: null,
    application_status: 'accepted',
    allowed_status_targets: ['follow_up', 'decision_pending', 'rejected'],
    ...overrides,
  } as AdmissionListItem;
}

function renderAr(ui: React.ReactElement) {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'ar');
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'ar');
  executeAdmissionAction.mockReset();
  executeAdmissionsBulkAction.mockReset();
});

afterEach(() => cleanup());

describe('15B helpers', () => {
  it('normalizes targets from payload only', () => {
    expect(normalizeAllowedStatusTargets(['decision_pending', 'new', 'decision_pending'])).toEqual([
      'decision_pending',
      'new',
    ]);
    expect(normalizeAllowedStatusTargets(undefined)).toEqual([]);
  });

  it('shows change status only when allowed_status_targets non-empty', () => {
    expect(canShowChangeStatusAction(detail())).toBe(true);
    expect(canShowChangeStatusAction(detail({ allowed_status_targets: [] }))).toBe(false);
    expect(
      canShowChangeStatusAction(
        detail({ application_status: 'registered', allowed_status_targets: ['accepted'] }),
      ),
    ).toBe(false);
  });

  it('intersects bulk targets', () => {
    expect(
      intersectAllowedStatusTargets([
        listItem({ allowed_status_targets: ['new', 'follow_up', 'decision_pending'] }),
        listItem({ id: 2, allowed_status_targets: ['follow_up', 'decision_pending', 'rejected'] }),
      ]),
    ).toEqual(['follow_up', 'decision_pending']);
    expect(
      intersectAllowedStatusTargets([
        listItem({ allowed_status_targets: ['new'] }),
        listItem({ id: 2, allowed_status_targets: ['closed'] }),
      ]),
    ).toEqual([]);
  });

  it('requires note trim and family approval for ready', () => {
    expect(validateChangeStatus({ target_status: 'follow_up', note: '   ' })).toBe(
      'admin.admissions.changeStatusDialog.noteRequired',
    );
    expect(
      validateChangeStatus({
        target_status: 'ready_for_registration',
        note: 'سبب',
        confirmFamilyApproval: false,
      }),
    ).toBe('admin.admissions.changeStatusDialog.familyApprovalRequired');
    expect(
      validateChangeStatus({
        target_status: 'ready_for_registration',
        note: 'سبب',
        confirmFamilyApproval: true,
      }),
    ).toBeNull();
  });

  it('labels decision_pending correctly and school decisions are accept/reject only', () => {
    expect(applicationStatusLabelKey('decision_pending')).toBe(
      'admin.admissions.applicationStatus.decision_pending',
    );
    expect([...getAdmissionDecisionOptions()]).toEqual(['accepted', 'rejected']);
    expect(getAdmissionDecisionOptions()).not.toContain('accepted_with_condition');
    expect(getAdmissionDecisionOptions()).not.toContain('waitlisted');
  });

  it('keeps six detail tabs order and enables DnD targets except registered', () => {
    expect(ADMISSION_TABS).toEqual([
      'summary',
      'family_data',
      'assessments_appointments',
      'decision',
      'offer_registration',
      'history',
    ]);
    expect(presentationColumnDropStage('decision_pending')).toBe('decision_pending');
    expect(presentationColumnDropStage('registered')).toBeNull();
    expect(isRawKanbanDropTarget('accepted')).toBe(true);
    expect(isRawKanbanDropTarget('registered')).toBe(false);
  });

  it('does not surface old confusing copy in active list wiring', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const listPage = readFileSync(
      resolve(process.cwd(), 'src/features/admin/admissions/components/admissions-list-page.tsx'),
      'utf8',
    );
    expect(listPage).not.toContain('manualStageDisabled');
    expect(listPage).not.toContain('modeHint');
    expect(listPage).not.toContain('admissions-bulk-disabled');
  });
});

describe('AdmissionPrimaryActionPanel — change status', () => {
  it('shows Change status when allowed_status_targets present; hides when empty', () => {
    renderAr(
      <AdmissionPrimaryActionPanel detail={detail()} admissionId={77} onUpdated={vi.fn()} />,
    );
    expect(screen.getByTestId('admission-change-status-action').textContent).toContain(
      'تغيير الحالة',
    );
    cleanup();
    renderAr(
      <AdmissionPrimaryActionPanel
        detail={detail({ allowed_status_targets: [] })}
        admissionId={77}
        onUpdated={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('admission-change-status-action')).toBeNull();
  });

  it('shows terminal reason and still offers change status when Backend allows', () => {
    renderAr(
      <AdmissionPrimaryActionPanel
        detail={detail({
          application_status: 'rejected',
          rejection: { is_rejected: true, reason: 'نقص وثائق' },
          allowed_status_targets: ['follow_up', 'new'],
          modern_allowed_actions: [{ code: 'change_status', allowed: true }],
        })}
        admissionId={77}
        onUpdated={vi.fn()}
      />,
    );
    expect(screen.getByTestId('admission-terminal-reason').textContent).toContain('نقص وثائق');
    expect(screen.getByTestId('admission-change-status-action')).toBeTruthy();
  });

  it('offers waitlist as independent action from allowed_status_targets', () => {
    renderAr(
      <AdmissionPrimaryActionPanel detail={detail()} admissionId={77} onUpdated={vi.fn()} />,
    );
    expect(screen.getByTestId('admission-waitlist-status-action').textContent).toMatch(
      /انتظار|Waitlist|attente/i,
    );
  });
});

describe('AdmissionChangeStatusDialog', () => {
  it('options from payload, rejected/closed note labels, trim + correct single request', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    executeAdmissionAction.mockResolvedValue({
      success: true,
      data: {
        id: 77,
        application_status: 'decision_pending',
        allowed_status_targets: ['new'],
        timeline: [{ code: 'change_status' }],
      },
      meta: {},
    });

    renderAr(
      <AdmissionChangeStatusDialog
        admissionId={77}
        currentStatus="accepted"
        allowedStatusTargets={['decision_pending', 'rejected', 'closed']}
        open
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    const select = screen.getByTestId('admission-change-status-target') as HTMLSelectElement;
    const values = within(select)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value);
    expect(values).toEqual(['decision_pending', 'rejected', 'closed']);
    expect(values).not.toContain('registered');

    expect(screen.getByText(/بانتظار قرار الإدارة/)).toBeTruthy();
    expect(screen.getByTestId('admission-change-status-warning').textContent).toContain('سجل');

    await user.selectOptions(select, 'rejected');
    expect(screen.getByLabelText('سبب الرفض')).toBeTruthy();
    await user.selectOptions(select, 'closed');
    expect(screen.getByLabelText('سبب الإغلاق')).toBeTruthy();
    await user.selectOptions(select, 'decision_pending');
    expect(screen.getByLabelText('سبب تغيير الحالة')).toBeTruthy();

    await user.click(screen.getByTestId('admission-change-status-confirm'));
    expect(executeAdmissionAction).not.toHaveBeenCalled();

    const note = screen.getByTestId('admission-change-status-note');
    expect(note.getAttribute('dir')).toBe('auto');
    await user.type(note, '  نقل إلى بانتظار القرار  ');
    await user.click(screen.getByTestId('admission-change-status-confirm'));

    await waitFor(() => expect(executeAdmissionAction).toHaveBeenCalledTimes(1));
    expect(executeAdmissionAction.mock.calls[0][1]).toEqual({
      action: 'change_status',
      target_status: 'decision_pending',
      note: 'نقل إلى بانتظار القرار',
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('requires family approval checkbox before ready_for_registration', async () => {
    const user = userEvent.setup();
    executeAdmissionAction.mockResolvedValue({
      success: true,
      data: { id: 1, application_status: 'ready_for_registration' },
      meta: {},
    });
    renderAr(
      <AdmissionChangeStatusDialog
        admissionId={1}
        currentStatus="accepted"
        allowedStatusTargets={['ready_for_registration']}
        open
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    await user.type(screen.getByTestId('admission-change-status-note'), 'موافقة');
    await user.click(screen.getByTestId('admission-change-status-confirm'));
    expect(executeAdmissionAction).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('admission-change-status-family-approval'));
    await user.click(screen.getByTestId('admission-change-status-confirm'));
    await waitFor(() => expect(executeAdmissionAction).toHaveBeenCalledTimes(1));
    expect(executeAdmissionAction.mock.calls[0][1]).toMatchObject({
      action: 'change_status',
      target_status: 'ready_for_registration',
      confirm_family_approval: true,
    });
  });

  it('keeps dialog open on backend error and blocks double submit', async () => {
    const user = userEvent.setup();
    let resolveAction: (value: unknown) => void = () => undefined;
    executeAdmissionAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    renderAr(
      <AdmissionChangeStatusDialog
        admissionId={1}
        currentStatus="accepted"
        allowedStatusTargets={['follow_up']}
        open
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    await user.type(screen.getByTestId('admission-change-status-note'), 'سبب');
    const confirm = screen.getByTestId('admission-change-status-confirm');
    await user.click(confirm);
    await user.click(confirm);
    expect(executeAdmissionAction).toHaveBeenCalledTimes(1);
    resolveAction({ success: false, error: { message: 'target_status not allowed' } });
    await waitFor(() =>
      expect(screen.getByTestId('admission-change-status-server-error')).toBeTruthy(),
    );
    expect(screen.getByTestId('admission-change-status-dialog')).toBeTruthy();
  });

  it('bulk uses one endpoint and keeps selection on failure via callback', async () => {
    const user = userEvent.setup();
    const onBulkFailure = vi.fn();
    const onClear = vi.fn();
    executeAdmissionsBulkAction.mockResolvedValue({
      success: false,
      error: {
        message: 'blocked',
        details: {
          blockers: [{ application_id: 1, message: 'غير مسموح للطلب 1' }],
        },
      },
      meta: {},
    });

    renderAr(
      <AdmissionChangeStatusDialog
        admissionIds={[1, 2]}
        allowedStatusTargets={['follow_up']}
        open
        onClose={vi.fn()}
        onBulkFailure={onBulkFailure}
        onBulkSuccess={() => onClear()}
      />,
    );

    await user.type(screen.getByTestId('admission-change-status-note'), 'جماعي');
    await user.click(screen.getByTestId('admission-change-status-confirm'));
    await waitFor(() => expect(executeAdmissionsBulkAction).toHaveBeenCalledTimes(1));
    expect(executeAdmissionAction).not.toHaveBeenCalled();
    expect(executeAdmissionsBulkAction.mock.calls[0][0]).toMatchObject({
      action: 'change_status',
      application_ids: [1, 2],
      target_status: 'follow_up',
      note: 'جماعي',
    });
    expect(onBulkFailure).toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
    expect(screen.getByTestId('admission-change-status-blockers').textContent).toContain(
      'غير مسموح',
    );
  });
});

describe('AdmissionsBulkActionBar', () => {
  it('disables when intersection empty and shows count', () => {
    renderAr(
      <AdmissionsBulkActionBar
        selectedItems={[
          listItem({ id: 1, allowed_status_targets: ['new'] }),
          listItem({ id: 2, allowed_status_targets: ['closed'] }),
        ]}
        onClearSelection={vi.fn()}
      />,
    );
    expect(screen.getByTestId('admissions-bulk-selected-count').textContent).toContain('2');
    expect(screen.getByTestId('admissions-bulk-no-shared-targets')).toBeTruthy();
    expect(
      (screen.getByTestId('admissions-bulk-change-status') as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
