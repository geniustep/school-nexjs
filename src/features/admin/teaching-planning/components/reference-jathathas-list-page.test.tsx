// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { CurrentUser } from '@/types/user';
import type { ReferenceJathathaSummary } from '@/types/jathatha';
import { endpoints } from '@/lib/api/endpoints';

vi.mock('../teaching-planning.css', () => ({}));
vi.mock('../teaching-planning-list.css', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/admin/teaching-planning/reference-jathathas' }));
vi.mock('./reference-jathatha-dialogs', () => ({ ReferenceJathathaEditorDialog: () => null }));
vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ requiresActiveSchool: false, activeSchoolId: 1 }),
}));

const sessionUser = vi.fn<() => CurrentUser>();
vi.mock('@/features/auth/session-context', () => ({ useSession: () => sessionUser() }));
type Resource = { data: unknown; loading: boolean; initialLoading: boolean; fetching: boolean; error: { code: string; message: string } | null; meta: { pagination?: { page: number; page_size: number; total: number; total_pages: number } } | null; reload: ReturnType<typeof vi.fn> };
const resourceByPath = vi.fn<(path: string | null) => Resource>();
vi.mock('@/lib/hooks/use-admin-resource', () => ({ useAdminResource: (path: string | null) => resourceByPath(path) }));

import { ReferenceJathathasListPage } from './reference-jathathas-list-page';

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
function row(): ReferenceJathathaSummary {
  return {
    id: 3, name: 'Fractions reference Jathatha', school: { id: 1, name: 'School' },
    reference: { id: 2, name: 'Maths' }, sequence: { id: 3, name: 'Fractions' },
    session_template: { id: 4, name: 'Session 1' }, session_type: 'lesson',
    level: { id: 5, name: 'Grade 6' }, subject: { id: 6, name: 'Maths' },
    teaching_language: { id: 7, name: 'English', code: 'en' }, track: null,
    default_detail_level: 'standard', activity_count: 2, phase_count: 3, planned_duration_minutes: 40,
    state: 'draft', version_label: 'v1', approved_at: null,
  };
}
function wire(main: Resource) {
  resourceByPath.mockImplementation((path) => path === endpoints.admin.referenceJathathas ? main : resource());
}
function renderList() {
  return render(<LocaleProvider><ReferenceJathathasListPage /></LocaleProvider>);
}

describe('ReferenceJathathasListPage', () => {
  beforeEach(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    sessionUser.mockReturnValue(admin(['teaching.planning.view', 'teaching.reference_jathathas.manage']));
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('shows its initial loading state', () => {
    wire(resource({ data: null, initialLoading: true }));
    renderList();
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('renders loaded rows and pagination metadata', () => {
    wire(resource({ data: [row()], meta: { pagination: { page: 1, page_size: 20, total: 21, total_pages: 2 } } }));
    renderList();
    expect(screen.getByText('Fractions reference Jathatha')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
  });

  it('shows the empty list text', () => {
    wire(resource());
    renderList();
    expect(screen.getByText('No jathathas found.')).toBeTruthy();
  });

  it('shows create only with the reference-jathathas manage capability', () => {
    wire(resource({ data: [row()] }));
    renderList();
    expect(screen.getByRole('button', { name: /Create reference jathatha/ })).toBeTruthy();
    cleanup();
    sessionUser.mockReturnValue(admin(['teaching.planning.view']));
    renderList();
    expect(screen.queryByRole('button', { name: /Create reference jathatha/ })).toBeNull();
  });

  it('keeps rows visible while refetching rather than flashing the empty state', () => {
    wire(resource({ data: [row()], loading: true, fetching: true }));
    renderList();
    expect(screen.getByText('Fractions reference Jathatha')).toBeTruthy();
    expect(screen.queryByText('No jathathas found.')).toBeNull();
  });

  it('gates the surface when canViewTeachingPlanning is false', () => {
    sessionUser.mockReturnValue(admin([]));
    wire(resource({ data: [row()] }));
    renderList();
    expect(screen.queryByText('Fractions reference Jathatha')).toBeNull();
    expect(screen.getByText('You do not have permission to view this page.')).toBeTruthy();
  });
});
