/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '@/types/user';

const { optionsFetchSpy, apiPostSpy, toastErrorSpy } = vi.hoisted(() => ({
  optionsFetchSpy: vi.fn(),
  apiPostSpy: vi.fn(),
  toastErrorSpy: vi.fn(),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useLocale: () => ({ locale: 'ar', setLocale: vi.fn(), t: (key: string) => key, dir: 'rtl' }),
  useT: () => (key: string) => key,
}));

vi.mock('@/features/auth/session-context', () => ({ useSession: vi.fn() }));
vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ activeSchoolId: 1 }),
}));
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: toastErrorSpy, show: vi.fn() }),
}));
vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...actual,
    api: { ...actual.api, post: apiPostSpy },
  };
});
vi.mock('@/features/admin/academic-setup/hooks/use-level-options', () => ({
  useLevelOptions: () => ({
    loading: false,
    error: null,
    reload: vi.fn(),
    options: {
      reference_levels: [{ id: 70, name: 'السابع', code: '7', cycle_id: 3 }],
      cycles: [{ id: 3, name: 'الإعدادي' }],
    },
  }),
}));

vi.mock('../hooks/use-student-options', () => ({
  useStudentOptions: () => {
    optionsFetchSpy();
    return {
      loading: false,
      error: null,
      reload: vi.fn(),
      options: {
        academicYears: [{ id: 2026, name: '2026/2027', is_current: true }],
        levels: [{ id: 7, name: 'السابع', academic_year_id: 2026 }],
        classes: [],
        nationalities: [{ id: 1, name: 'المغرب', code: 'MA' }],
      },
    };
  },
}));
vi.mock('../utils/guardian-global-search', () => ({
  GUARDIAN_GLOBAL_SEARCH_MIN_QUERY: 2,
  searchGuardiansGlobally: vi.fn().mockResolvedValue([]),
}));

import { useSession } from '@/features/auth/session-context';
import { FamilyRegistrationV2Page } from './family-registration-v2-page';

function userWithCapabilities(capabilities: string[]): CurrentUser {
  return {
    id: 1,
    name: 'Tester',
    email: 'tester@example.com',
    role: 'admin',
    permissions: [],
    effective_permissions: [],
    effective_capabilities: capabilities,
    school: null,
  };
}

describe('FamilyRegistrationV2Page governed functional shell', () => {
  beforeEach(() => {
    optionsFetchSpy.mockClear();
    apiPostSpy.mockReset();
    toastErrorSpy.mockReset();
    vi.mocked(useSession).mockReset();
  });

  afterEach(() => cleanup());

  it('denies access without students.create before mounting student options', () => {
    vi.mocked(useSession).mockReturnValue(userWithCapabilities([]));
    render(<FamilyRegistrationV2Page />);

    expect(screen.getByTestId('family-registration-v2-denied')).toBeTruthy();
    expect(optionsFetchSpy).not.toHaveBeenCalled();
  });

  it('lets single-guardian context explicitly choose the mother', () => {
    vi.mocked(useSession).mockReturnValue(userWithCapabilities(['students.create']));
    render(<FamilyRegistrationV2Page />);

    fireEvent.click(screen.getByRole('button', { name: 'ولي واحد' }));
    fireEvent.click(screen.getByRole('button', { name: 'الأم' }));

    expect(screen.getByTestId('family-v2-mother')).toBeTruthy();
    expect(screen.queryByTestId('family-v2-father')).toBeNull();
  });

  it('blocks separated/divorced mutation at the UI contract gate', () => {
    vi.mocked(useSession).mockReturnValue(userWithCapabilities(['students.create']));
    render(<FamilyRegistrationV2Page />);

    fireEvent.click(screen.getByRole('button', { name: 'منفصلان / مطلقان' }));
    const submit = screen.getByRole('button', { name: 'اعتماد تسجيل الأسرة' });

    expect(submit.hasAttribute('disabled')).toBe(true);
    expect(apiPostSpy).not.toHaveBeenCalled();
  });
});
