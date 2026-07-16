// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import { endpoints } from '@/lib/api/endpoints';
import type { CurrentUser } from '@/types/user';
import type { TeacherJathathaSummary } from '@/types/jathatha';

vi.mock('../teaching-planning.css', () => ({}));
vi.mock('../teaching-planning-list.css', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/admin/teaching-planning/teacher-jathathas' }));
vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ requiresActiveSchool: false, activeSchoolId: 1 }),
}));
const sessionUser = vi.fn<() => CurrentUser>();
vi.mock('@/features/auth/session-context', () => ({ useSession: () => sessionUser() }));
type Resource = { data: unknown; loading: boolean; initialLoading: boolean; fetching: boolean; error: { code: string; message: string } | null; meta: { pagination?: { page: number; page_size: number; total: number; total_pages: number } } | null; reload: ReturnType<typeof vi.fn> };
const resourceByPath = vi.fn<(path: string | null) => Resource>();
vi.mock('@/lib/hooks/use-admin-resource', () => ({ useAdminResource: (path: string | null) => resourceByPath(path) }));

import { TeacherJathathasReviewListPage } from './teacher-jathathas-review-list-page';

function admin(caps: string[]): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: 'admin@test.local',
    role: 'admin',
    effective_capabilities: caps,
    permissions: [],
    school: { id: 1, name: 'School' },
  } satisfies CurrentUser;
}
function resource(overrides: Partial<Resource> = {}): Resource {
  return { data: [], loading: false, initialLoading: false, fetching: false, error: null, meta: null, reload: vi.fn(), ...overrides };
}
function row(): TeacherJathathaSummary {
  return {
    id: 8, name: 'Fractions lesson', session_occurrence: null,
    teacher: { id: 1, name: 'Ms Teacher' }, class: { id: 2, name: 'Class 6A' },
    subject: { id: 3, name: 'Maths' }, offering: { id: 4, name: 'Grade 6 Maths' },
    distribution: { id: 5, name: 'Term 1' }, distribution_line: { id: 6, name: 'Fractions line' },
    sequence: { id: 7, name: 'Fractions' }, session_template: null, reference_jathatha: null,
    state: 'ready', review_state: 'correction_requested', revision_number: 2, detail_level: 'standard',
    planned_duration_minutes: 45, readiness: { ready: false, blockers: ['incomplete'], warnings: [] },
    correction_requested: true, correction_reason: 'Clarify assessment', reviewed_at: null, reviewed_by: null,
    session_date: '2026-01-15', session_start_time: '09:00', session_end_time: '09:45',
  };
}
function wire(main: Resource) {
  resourceByPath.mockImplementation((path) => path === endpoints.admin.teacherJathathasAdmin ? main : resource());
}
function renderList() {
  return render(<LocaleProvider><TeacherJathathasReviewListPage /></LocaleProvider>);
}

describe('TeacherJathathasReviewListPage', () => {
  beforeEach(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    sessionUser.mockReturnValue(admin(['teaching.jathathas.view', 'teaching.jathathas.review']));
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('shows initial loading', () => {
    wire(resource({ data: null, initialLoading: true }));
    renderList();
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('renders rows, review state and correction indication', () => {
    wire(resource({ data: [row()] }));
    renderList();
    expect(screen.getByText('Ms Teacher')).toBeTruthy();
    expect(screen.getAllByText('Correction requested')).toHaveLength(1);
  });

  it('shows the empty state for an empty loaded list', () => {
    wire(resource());
    renderList();
    expect(screen.getByText('No jathathas found.')).toBeTruthy();
  });

  it('does not show a false empty state while data is refetching', () => {
    wire(resource({ data: [row()], loading: true, fetching: true }));
    renderList();
    expect(screen.getByText('Ms Teacher')).toBeTruthy();
    expect(screen.queryByText('No jathathas found.')).toBeNull();
  });

  it('allows either view or review capability through teaching planning access', () => {
    sessionUser.mockReturnValue(admin(['teaching.jathathas.review']));
    wire(resource({ data: [row()] }));
    renderList();
    expect(screen.getByText('Ms Teacher')).toBeTruthy();
    cleanup();
    sessionUser.mockReturnValue(admin([]));
    renderList();
    expect(screen.getByText('You do not have permission to view this page.')).toBeTruthy();
  });
});
