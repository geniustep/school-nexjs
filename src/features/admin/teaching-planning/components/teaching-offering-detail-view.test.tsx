// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { TeachingOfferingDetail } from '@/types/teaching-planning';

vi.mock('../teaching-planning.css', () => ({}));

const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/components/ui/toast', () => ({
  useToast: () => toast,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/i18n/use-format', () => ({
  useFormat: () => ({
    formatDateTime: (value: string) => value,
    formatDate: (value: string) => value,
  }),
}));

vi.mock('@/lib/hooks/use-admin-resource', () => ({
  useAdminResource: () => ({
    data: [],
    loading: false,
    error: null,
    meta: null,
    reload: vi.fn(),
  }),
}));

const approveTeachingOffering = vi.fn();
const submitTeachingOfferingForReview = vi.fn();
const archiveTeachingOffering = vi.fn();
const deleteTeachingOffering = vi.fn();
const duplicateTeachingOffering = vi.fn();
const resetTeachingOfferingToDraft = vi.fn();

const activateTeachingOffering = vi.fn();

vi.mock('../api/teaching-offerings-api', () => ({
  approveTeachingOffering: (...args: unknown[]) => approveTeachingOffering(...args),
  submitTeachingOfferingForReview: (...args: unknown[]) =>
    submitTeachingOfferingForReview(...args),
  archiveTeachingOffering: (...args: unknown[]) => archiveTeachingOffering(...args),
  deleteTeachingOffering: (...args: unknown[]) => deleteTeachingOffering(...args),
  duplicateTeachingOffering: (...args: unknown[]) => duplicateTeachingOffering(...args),
  resetTeachingOfferingToDraft: (...args: unknown[]) => resetTeachingOfferingToDraft(...args),
  activateTeachingOffering: (...args: unknown[]) => activateTeachingOffering(...args),
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    id: 1,
    name: 'Admin',
    login: 'admin',
    role: 'admin',
    effective_capabilities: [
      'teaching.planning.view',
      'teaching.offerings.manage',
      'teaching.offerings.approve',
      'teaching.distributions.manage',
    ],
    permissions: [],
  }),
}));

vi.mock('./annual-distribution-dialogs', () => ({
  AnnualDistributionEditorDialog: () => null,
}));

vi.mock('@/features/admin/academic-setup/hooks/use-teaching-assignments', () => ({
  updateTeachingAssignment: vi.fn(),
}));

vi.mock('./teaching-offering-dialogs', () => ({
  TeachingOfferingEditorDialog: () => null,
}));

vi.mock('./teaching-reference-dialogs', () => ({
  TeachingPlanningResetDialog: () => null,
}));

import { TeachingOfferingDetailView } from './teaching-offering-detail-view';

function baseOffering(
  overrides: Partial<TeachingOfferingDetail> = {},
): TeachingOfferingDetail {
  return {
    id: 7,
    display_name: 'السادس — الرياضيات — Arabic — 2026/2027',
    school: { id: 1, name: 'مدرسة النور' },
    academic_year: { id: 2, name: '2026/2027' },
    level: { id: 3, name: 'السادس' },
    subject: { id: 4, name: 'الرياضيات', code: 'MATH' },
    teaching_language: { id: 9, code: 'ar_001', name: 'Arabic' },
    track: null,
    reference: {
      id: 12,
      name: 'مرجع الرياضيات',
      school: { id: 1, name: 'مدرسة النور' },
      subject: { id: 4, name: 'الرياضيات' },
      level: { id: 3, name: 'السادس' },
      teaching_language: { id: 9, code: 'ar_001', name: 'Arabic' },
      track: null,
      publisher: null,
      edition: null,
      version_label: null,
      reference_code: null,
      isbn: null,
      state: 'approved',
      active: true,
      supersedes_id: null,
      offering_count: 1,
    },
    state: 'approved',
    active: true,
    effective_from: null,
    effective_to: null,
    assignment_count: 1,
    class_count: 1,
    teacher_count: 1,
    readiness: {
      identity_ready: true,
      reference_ready: true,
      assignments_ready: true,
      assignments_count: 1,
      classes_count: 1,
      teachers_count: 1,
      distribution_ready: false,
      ready_for_approval: true,
      ready_for_activation: false,
      blockers: ['annual_distribution_required'],
    },
    activation_blockers: ['annual_distribution_required'],
    notes: null,
    approved_by_id: 1,
    approved_at: '2026-07-01 10:00:00',
    reset_reason: null,
    archived_by_id: null,
    archived_at: null,
    assignments: [
      {
        id: 55,
        class: { id: 8, name: '6أ' },
        teacher: { id: 9, name: 'سلمى' },
        subject: { id: 4, name: 'الرياضيات' },
        state: 'active',
        active: true,
        role: 'main',
      },
    ],
    allowed_actions: {
      view: true,
      edit: false,
      submit_for_review: false,
      approve: false,
      reset_to_draft: false,
      archive: true,
      duplicate: true,
      delete: false,
      link_assignments: true,
    },
    ...overrides,
  };
}

function renderDetail(offering: TeachingOfferingDetail, onReload = vi.fn()) {
  return render(
    <LocaleProvider>
      <TeachingOfferingDetailView offering={offering} onReload={onReload} />
    </LocaleProvider>,
  );
}

describe('TeachingOfferingDetailView', () => {
  beforeEach(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders readiness with annual_distribution_required and ready_for_activation=false', async () => {
    const user = userEvent.setup();
    renderDetail(baseOffering());
    expect(
      screen.getByText('Annual distribution still required'),
    ).toBeTruthy();
    expect(screen.getByText('Ready for activation')).toBeTruthy();
    expect(screen.getAllByText('Not ready').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /^Reference$/i }));
    expect(screen.getByText('مرجع الرياضيات')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Linked assignments|Assignments/i }));
    expect(screen.getByText((_, el) => el?.textContent === '6أ · سلمى')).toBeTruthy();
  });

  it('does not treat approved as activation-ready and hides edit without allowed_actions.edit', () => {
    renderDetail(baseOffering());
    expect(screen.queryByRole('button', { name: /^Edit$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /^Duplicate$/i })).toBeTruthy();
  });

  it('maps Backend lifecycle errors without refetch', async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    archiveTeachingOffering.mockResolvedValue({
      success: false,
      error: { code: 'invalid_state', message: 'Archive failed.' },
      meta: {},
    });
    renderDetail(baseOffering(), onReload);
    await user.click(screen.getByRole('button', { name: /^Archive$/i }));
    const confirmButtons = screen.getAllByRole('button', { name: /^Archive$/i });
    await user.click(confirmButtons[confirmButtons.length - 1]!);
    expect(toast.error).toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
  });

  it('refetches after successful duplicate navigation path returns data', async () => {
    const onReload = vi.fn();
    duplicateTeachingOffering.mockResolvedValue({
      success: true,
      data: baseOffering({ id: 99, state: 'draft' }),
      meta: {},
    });
    renderDetail(baseOffering(), onReload);
    await userEvent.click(screen.getByRole('button', { name: /Duplicate|نسخ|Dupliquer/i }));
    expect(duplicateTeachingOffering).toHaveBeenCalledWith(7);
    expect(toast.success).toHaveBeenCalled();
  });

  it('shows activate from allowed_actions and links active distribution without Teaching Progress', async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    activateTeachingOffering.mockResolvedValue({
      success: true,
      data: baseOffering({
        state: 'active',
        distribution_count: 1,
        active_distribution: {
          id: 44,
          name: 'Active distribution',
          version_label: 'v1',
          state: 'active',
        } as TeachingOfferingDetail['active_distribution'],
        readiness: {
          identity_ready: true,
          reference_ready: true,
          assignments_ready: true,
          assignments_count: 1,
          classes_count: 1,
          teachers_count: 1,
          distribution_ready: true,
          ready_for_approval: true,
          ready_for_activation: true,
          blockers: [],
        },
        activation_blockers: [],
        allowed_actions: {
          view: true,
          activate: true,
          edit: false,
          archive: false,
          duplicate: false,
          delete: false,
          link_assignments: false,
        },
      }),
      meta: {},
    });

    renderDetail(
      baseOffering({
        distribution_count: 1,
        active_distribution: {
          id: 44,
          name: 'Active distribution',
          version_label: 'v1',
          state: 'active',
        } as TeachingOfferingDetail['active_distribution'],
        readiness: {
          identity_ready: true,
          reference_ready: true,
          assignments_ready: true,
          assignments_count: 1,
          classes_count: 1,
          teachers_count: 1,
          distribution_ready: true,
          ready_for_approval: true,
          ready_for_activation: true,
          blockers: [],
        },
        activation_blockers: [],
        allowed_actions: {
          view: true,
          activate: true,
          edit: false,
          archive: false,
          duplicate: false,
          delete: false,
          link_assignments: false,
        },
      }),
      onReload,
    );

    expect(
      screen.getByRole('link', { name: /Active distribution/i }).getAttribute('href'),
    ).toBe('/admin/teaching-planning/distributions/44');
    expect(screen.queryByText(/Teaching Progress|Actual Delivery|Jathatha/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: /^Activate$/i }));
    const confirmButtons = screen.getAllByRole('button', { name: /^Activate$/i });
    await user.click(confirmButtons[confirmButtons.length - 1]!);
    await waitFor(() => {
      expect(activateTeachingOffering).toHaveBeenCalledWith(7);
      expect(onReload).toHaveBeenCalled();
    });
  });
});
