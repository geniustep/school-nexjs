/**
 * @vitest-environment happy-dom
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '@/types/user';

const optionsFetchSpy = vi.fn();

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: vi.fn(),
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ activeSchoolId: 1 }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    show: vi.fn(),
  }),
}));

vi.mock('../hooks/use-student-options', () => ({
  useStudentOptions: () => {
    optionsFetchSpy();
    return { loading: false, options: null, error: null, reload: vi.fn() };
  },
}));

vi.mock('@/features/admin/admissions/hooks/use-admission-options', () => ({
  useAdmissionOptions: () => ({
    loading: false,
    options: null,
    error: null,
    reload: vi.fn(),
  }),
}));

vi.mock('@/features/admin/academic-setup/hooks/use-level-options', () => ({
  useLevelOptions: () => ({
    loading: false,
    levels: [],
    error: null,
    reload: vi.fn(),
  }),
}));

vi.mock('./family-registration-finance-panel', () => ({
  FamilyRegistrationFinancePanel: () => null,
}));

vi.mock('./student-create-billing-step', () => ({
  StudentCreateBillingStep: () => <div data-testid="family-registration-billing-step" />,
}));

vi.mock('./family-registration-steps', () => ({
  FamilyRegistrationStepper: () => <nav data-testid="family-registration-stepper" />,
}));

vi.mock('./student-create-section-header', () => ({
  StudentCreateStyledSection: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section data-testid="family-registration-form-section">
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

import { useSession } from '@/features/auth/session-context';
import { FamilyRegistrationPage } from './family-registration-page';

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

describe('FamilyRegistrationPage RBAC gate', () => {
  beforeEach(() => {
    optionsFetchSpy.mockClear();
    vi.mocked(useSession).mockReset();
  });

  afterEach(() => cleanup());

  it('denies access without students.create and does not mount registration options', () => {
    vi.mocked(useSession).mockReturnValue(userWithCapabilities([]));
    render(<FamilyRegistrationPage />);

    expect(screen.getByTestId('family-registration-denied')).toBeTruthy();
    expect(screen.queryByTestId('family-registration-stepper')).toBeNull();
    expect(screen.queryByTestId('family-registration-billing-step')).toBeNull();
    expect(optionsFetchSpy).not.toHaveBeenCalled();
  });

  it('renders the registration form when students.create is granted', () => {
    vi.mocked(useSession).mockReturnValue(userWithCapabilities(['students.create']));
    render(<FamilyRegistrationPage />);

    expect(screen.queryByTestId('family-registration-denied')).toBeNull();
    expect(screen.getByTestId('family-registration-stepper')).toBeTruthy();
    expect(screen.getByTestId('family-registration-billing-step')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(optionsFetchSpy).toHaveBeenCalled();
  });
});
