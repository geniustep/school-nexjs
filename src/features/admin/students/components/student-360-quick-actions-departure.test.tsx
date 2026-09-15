/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StudentCapabilities, StudentDetailsData } from '@/types/student-360';
import type { StudentOverviewData } from '@/types/student-overview';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({ id: 1, role: 'admin' }),
}));

vi.mock('@/lib/permissions/academic-capabilities', () => ({
  canArchiveStudents: () => false,
}));

vi.mock('@/features/admin/finance/use-finance-lookups', () => ({
  useFinanceReferenceData: () => ({ academicYears: [] }),
}));

vi.mock('@/features/admin/student-finance/hooks/use-student-financial-overview', () => ({
  useStudentFinancialOverview: () => ({
    data: null,
    loading: false,
    error: null,
    reload: vi.fn(),
    applyPatch: vi.fn(),
  }),
}));

vi.mock('@/features/admin/student-finance/hooks/use-student-family-finance', () => ({
  useStudentFamilyFinanceSummary: () => ({
    data: null,
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
}));

vi.mock('@/features/admin/student-finance/utils/resolve-finance-year-id', () => ({
  resolveFinanceYearId: () => '',
}));

vi.mock('@/features/admin/student-finance/utils/resolve-student-finance-overview', () => ({
  resolveStudentFinanceOverviewMetrics: () => null,
}));

vi.mock('../utils/resolve-student-header-finance-payment', () => ({
  resolveStudentHeaderFinancePaymentPresentation: () => ({
    visible: false,
    tone: 'normal',
  }),
}));

vi.mock('../utils/resolve-capabilities', () => ({
  canViewStudentFinance: () => false,
  canCollectStudentPayments: () => false,
}));

vi.mock('../utils/build-student-360-header-shell', () => ({
  buildStudent360HeaderOverflowActions: () => [],
}));

vi.mock('./student-departure-drawer', () => ({
  StudentDepartureDrawer: ({ open }: { open: boolean }) =>
    open ? <div>departure-drawer-open</div> : null,
}));

vi.mock('@/features/admin/student-finance/components/student-360-payment-entry', () => ({
  Student360PaymentEntry: () => null,
}));

import { Student360QuickActions } from './student-360-quick-actions';

const details = {
  student: { id: 42 },
  guardian_relationships: [],
  current_enrollment: null,
  document_summary: { missing_required: 0 },
  health_summary: { has_profile: false },
} as unknown as StudentDetailsData;

const caps = {
  can_manage: false,
  can_manage_guardians: false,
  can_view_finance: false,
  can_manage_documents: false,
  can_manage_health: false,
} as StudentCapabilities;

function overview(actions: string[]): StudentOverviewData {
  return { available: true, allowed_actions: actions } as StudentOverviewData;
}

function renderActions(actions: string[]) {
  return render(
    <Student360QuickActions
      details={details}
      caps={caps}
      overview={overview(actions)}
      archived={false}
      editHref="/admin/students/42/edit"
      onOpenTab={vi.fn()}
      onArchiveSuccess={vi.fn()}
    />,
  );
}

describe('Student360QuickActions departure authority', () => {
  afterEach(() => cleanup());

  it('renders departure when backend grants depart even without general edit authority', () => {
    renderActions(['view', 'depart']);
    fireEvent.click(screen.getByRole('button', { name: 'admin.student360.quickActions.more' }));
    expect(screen.getByRole('menuitem', { name: 'admin.student360.departure.action' })).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: 'admin.student360.departure.action' }));
    expect(screen.getByText('departure-drawer-open')).toBeTruthy();
  });

  it('does not render a departure affordance when depart is absent', () => {
    const { container } = renderActions(['view']);
    expect(container.textContent).not.toContain('admin.student360.departure.action');
    expect(container.querySelector('.student-360-quick-actions')).toBeNull();
  });
});
