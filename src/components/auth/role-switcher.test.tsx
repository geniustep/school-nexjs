/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleSwitcher } from '@/components/auth/role-switcher';

const switchRole = vi.fn(async () => true);
const clearError = vi.fn();

let mockCtx = {
  activeRole: 'admin',
  availableRoles: [
    { code: 'admin', label: 'مدير' },
    { code: 'teacher', label: 'أستاذة' },
    { code: 'parent', label: 'ولي أمر' },
  ],
  showSwitcher: true,
  switching: false,
  error: null as string | null,
  clearError,
  switchRole,
};

vi.mock('@/features/auth/active-role-context', () => ({
  useActiveRole: () => mockCtx,
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => {
    const map: Record<string, string> = {
      'auth.activeRole': 'الدور النشط',
      'auth.activeRoleMarker': 'نشط',
      'auth.switchingRole': 'جارٍ تبديل الدور…',
      'auth.roleSwitchErrors.role_switch_failed': 'تعذر تبديل الدور',
      'auth.roleSwitchErrors.role_not_available': 'غير متاح',
      'roles.admin': 'الإدارة',
      'roles.teacher': 'أستاذ',
      'roles.parent': 'ولي أمر',
    };
    return map[key] ?? key;
  },
}));

describe('RoleSwitcher', () => {
  beforeEach(() => {
    cleanup();
    switchRole.mockClear();
    clearError.mockClear();
    mockCtx = {
      activeRole: 'admin',
      availableRoles: [
        { code: 'admin', label: 'مدير' },
        { code: 'teacher', label: 'أستاذة' },
        { code: 'parent', label: 'ولي أمر' },
      ],
      showSwitcher: true,
      switching: false,
      error: null,
      clearError,
      switchRole,
    };
  });

  it('renders labeled switcher with active role for triple-role users', () => {
    render(<RoleSwitcher />);
    expect(screen.getByTestId('role-switcher')).toBeTruthy();
    expect(screen.getByText('الدور النشط')).toBeTruthy();
    const select = screen.getByRole('combobox', { name: /الدور النشط/ });
    expect((select as HTMLSelectElement).value).toBe('admin');
    expect(select.getAttribute('aria-label')).toContain('الدور النشط');
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('hides entirely for single-role users', () => {
    mockCtx.showSwitcher = false;
    const { container } = render(<RoleSwitcher />);
    expect(container.querySelector('[data-testid="role-switcher"]')).toBeNull();
  });

  it('disables the control while switching', () => {
    mockCtx.switching = true;
    render(<RoleSwitcher />);
    const select = screen.getByRole('combobox');
    expect((select as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('جارٍ تبديل الدور');
  });

  it('invokes switchRole on change and surfaces failure without changing workspace claim', async () => {
    const user = userEvent.setup();
    switchRole.mockResolvedValueOnce(false);
    mockCtx.error = null;
    const { rerender } = render(<RoleSwitcher />);
    await user.selectOptions(screen.getByRole('combobox'), 'teacher');
    expect(switchRole).toHaveBeenCalledWith('teacher');

    mockCtx.error = 'role_not_available';
    rerender(<RoleSwitcher />);
    expect(screen.getByRole('alert').textContent).toContain('غير متاح');
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('admin');
  });

  it('still exposes an accessible name when hideLabel is set', () => {
    render(<RoleSwitcher hideLabel />);
    expect(screen.queryByText('الدور النشط')).toBeNull();
    expect(screen.getByRole('combobox', { name: /الدور النشط/ })).toBeTruthy();
  });
});
