// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { CurrentUser } from '@/types/user';
import type { TeachingReferenceSummary } from '@/types/teaching-planning';

vi.mock('../teaching-planning.css', () => ({}));
vi.mock('../teaching-planning-list.css', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/teaching-planning/references',
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

vi.mock('./teaching-reference-dialogs', () => ({
  TeachingReferenceEditorDialog: () => null,
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

import { TeachingReferencesListPage } from './teaching-references-list-page';
import { endpoints } from '@/lib/api/endpoints';

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

function sampleRow(): TeachingReferenceSummary {
  return {
    id: 12,
    name: 'مرجع الرياضيات',
    school: { id: 1, name: 'مدرسة' },
    subject: { id: 4, name: 'الرياضيات' },
    level: { id: 3, name: 'السادس' },
    teaching_language: { id: 9, code: 'ar_001', name: 'Arabic' },
    track: null,
    publisher: null,
    edition: null,
    version_label: null,
    reference_code: 'MATH-P6',
    isbn: '978000',
    state: 'draft',
    active: true,
    supersedes_id: null,
    offering_count: 0,
  };
}

function wireResources(main: ResourceMock) {
  resourceByPath.mockImplementation((path) => {
    if (path === endpoints.admin.teachingReferences) return main;
    return emptyResource({ data: [] });
  });
}

function renderList() {
  return render(
    <LocaleProvider>
      <TeachingReferencesListPage />
    </LocaleProvider>,
  );
}

describe('TeachingReferencesListPage', () => {
  beforeEach(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    sessionUser.mockReturnValue(
      admin(['teaching.planning.view', 'teaching.references.manage']),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows initial loading', () => {
    wireResources(emptyResource({ data: null, loading: true, initialLoading: true }));
    renderList();
    expect(screen.getByText(/Loading|جار|Chargement|Cargando/i)).toBeTruthy();
  });

  it('renders loaded list rows', () => {
    wireResources(
      emptyResource({
        data: [sampleRow()],
        meta: { pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 } },
      }),
    );
    renderList();
    expect(screen.getByText('مرجع الرياضيات')).toBeTruthy();
    expect(screen.getByRole('button', { name: /New reference|Create/i })).toBeTruthy();
  });

  it('shows empty no-data state without create when manage capability is absent', () => {
    sessionUser.mockReturnValue(admin(['teaching.planning.view']));
    wireResources(emptyResource({ data: [] }));
    renderList();
    expect(screen.getByText(/No teaching references yet|لا توجد|Aucune|aún no/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /New reference|Create/i })).toBeNull();
  });

  it('maps permission errors through ResourceView', () => {
    wireResources(
      emptyResource({
        data: null,
        error: { code: 'forbidden', message: 'Forbidden' },
      }),
    );
    renderList();
    expect(screen.getByText(/Access restricted|غير مسموح|Accès|permiso/i)).toBeTruthy();
  });

  it('keeps previous rows visible while refetching (no false empty)', () => {
    wireResources(
      emptyResource({
        data: [sampleRow()],
        loading: true,
        initialLoading: false,
        fetching: true,
      }),
    );
    renderList();
    expect(screen.getByText('مرجع الرياضيات')).toBeTruthy();
    expect(screen.queryByText(/No teaching references yet/i)).toBeNull();
  });
});
