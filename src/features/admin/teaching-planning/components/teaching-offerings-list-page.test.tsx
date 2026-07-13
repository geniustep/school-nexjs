// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { CurrentUser } from '@/types/user';
import type { TeachingOfferingSummary } from '@/types/teaching-planning';

vi.mock('../teaching-offerings-list.css', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/teaching-planning/offerings',
  useSearchParams: () => new URLSearchParams(),
}));

const sessionUser = vi.fn<() => CurrentUser>();
vi.mock('@/features/auth/session-context', () => ({
  useSession: () => sessionUser(),
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({
    requiresActiveSchool: false,
    activeSchoolId: 1,
    schools: [{ id: 1, name: 'School' }],
    switching: false,
  }),
}));

vi.mock('@/features/admin/finance/use-finance-lookups', () => ({
  useAcademicYearOptions: () => ({ options: [{ id: 2, name: '2026/2027' }] }),
}));

vi.mock('./teaching-offering-dialogs', () => ({
  TeachingOfferingEditorDialog: () => null,
}));

type ResourceMock = {
  data: unknown;
  loading: boolean;
  initialLoading: boolean;
  fetching: boolean;
  error: { code: string; message: string } | null;
  meta: { pagination?: { page: number; page_size: number; total: number; total_pages: number } } | null;
  reload: ReturnType<typeof vi.fn>;
};

const resourceByPath = vi.fn<(path: string | null) => ResourceMock>();

vi.mock('@/lib/hooks/use-admin-resource', () => ({
  useAdminResource: (path: string | null) => resourceByPath(path),
}));

import { TeachingOfferingsListPage } from './teaching-offerings-list-page';
import { endpoints } from '@/lib/api/endpoints';

function admin(caps: string[]): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    login: 'admin',
    role: 'admin',
    effective_capabilities: caps,
    permissions: [],
  } as CurrentUser;
}

function emptyResource(overrides: Partial<ResourceMock> = {}): ResourceMock {
  return {
    data: [],
    loading: false,
    initialLoading: false,
    fetching: false,
    error: null,
    meta: null,
    reload: vi.fn(),
    ...overrides,
  };
}

function sampleRow(): TeachingOfferingSummary {
  return {
    id: 7,
    display_name: 'السادس — الرياضيات — Arabic — 2026/2027',
    school: { id: 1, name: 'مدرسة' },
    academic_year: { id: 2, name: '2026/2027' },
    level: { id: 3, name: 'السادس' },
    subject: { id: 4, name: 'الرياضيات' },
    teaching_language: { id: 9, code: 'ar_001', name: 'Arabic' },
    track: null,
    reference: null,
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
  };
}

function wireResources(main: ResourceMock) {
  resourceByPath.mockImplementation((path) => {
    if (path === endpoints.admin.teachingOfferings) return main;
    return emptyResource({ data: [] });
  });
}

function renderList() {
  return render(
    <LocaleProvider>
      <TeachingOfferingsListPage />
    </LocaleProvider>,
  );
}

describe('TeachingOfferingsListPage', () => {
  beforeEach(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    sessionUser.mockReturnValue(
      admin(['teaching.planning.view', 'teaching.offerings.manage']),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders list with readiness and annual_distribution_required blocker', () => {
    wireResources(
      emptyResource({
        data: [sampleRow()],
        meta: { pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 } },
      }),
    );
    renderList();
    expect(screen.getByText('السادس — الرياضيات — Arabic — 2026/2027')).toBeTruthy();
    expect(screen.getByText('Annual distribution is still required')).toBeTruthy();
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Active$/i)).toBeNull();
  });

  it('does not show create action without manage capability', () => {
    sessionUser.mockReturnValue(admin(['teaching.planning.view']));
    wireResources(emptyResource({ data: [sampleRow()] }));
    renderList();
    expect(screen.queryByRole('button', { name: /New offering/i })).toBeNull();
  });

  it('shows backend error state', () => {
    wireResources(
      emptyResource({
        data: null,
        error: { code: 'server_error', message: 'Upstream failed' },
      }),
    );
    renderList();
    expect(screen.getByText('Upstream failed')).toBeTruthy();
  });

  it('keeps rows during refetch instead of flashing empty', () => {
    wireResources(
      emptyResource({
        data: [sampleRow()],
        loading: true,
        initialLoading: false,
        fetching: true,
      }),
    );
    renderList();
    expect(screen.getByText('السادس — الرياضيات — Arabic — 2026/2027')).toBeTruthy();
    expect(screen.queryByText(/No teaching offerings yet/i)).toBeNull();
  });
});
