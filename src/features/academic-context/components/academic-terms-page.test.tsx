// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchTerms = vi.fn();
const initializeTerms = vi.fn();
const toast = { success: vi.fn(), error: vi.fn() };
const sessionUser = vi.fn();

vi.mock('@/features/academic-context/api/academic-context-api', () => ({
  fetchAcademicYearTerms: (...args: unknown[]) => fetchTerms(...args),
  initializeAcademicYearTerms: (...args: unknown[]) => initializeTerms(...args),
}));

vi.mock('@/features/admin/finance/use-finance-lookups', () => ({
  useAcademicYearOptions: () => ({
    options: [{ id: 1, name: '2026-2027' }],
    loading: false,
  }),
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => sessionUser(),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => toast,
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

import { AcademicTermsPage } from '@/features/academic-context/components/academic-terms-page';

const T1 = {
  id: 31,
  name: 'الدورة الأولى',
  code: 'T1',
  sequence: 1,
  date_start: '2026-09-01',
  date_end: '2027-01-15',
  state: 'active',
  active: true,
  academic_year: { id: 1, name: '2026-2027' },
};
const T2 = {
  id: 32,
  name: 'الدورة الثانية',
  code: 'T2',
  sequence: 2,
  date_start: '2027-01-16',
  date_end: '2027-06-30',
  state: 'active',
  active: true,
  academic_year: { id: 1, name: '2026-2027' },
};

afterEach(() => {
  cleanup();
  fetchTerms.mockReset();
  initializeTerms.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});

beforeEach(() => {
  sessionUser.mockReturnValue({
    role: 'admin',
    effective_capabilities: ['academic.terms.manage', 'academic.context.view'],
    permissions: ['view_classes'],
  });
  fetchTerms.mockResolvedValue({
    success: true,
    data: { terms: [T1, T2], allowed_actions: { initialize: false } },
    meta: {},
  });
});

describe('AcademicTermsPage screen', () => {
  it('lists T1/T2 as returned by Backend without rename and hides Initialize', async () => {
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('الدورة الأولى')).toBeTruthy());
    expect(screen.getByText('T1')).toBeTruthy();
    expect(screen.getByText('T2')).toBeTruthy();
    expect(screen.getByText('الدورة الثانية')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/term_1|term_2/);
    expect(screen.queryByText('academicContext.terms.initialize')).toBeNull();
  });

  it('shows Initialize only when zero terms and manage capability', async () => {
    fetchTerms.mockResolvedValue({
      success: true,
      data: { terms: [], allowed_actions: { initialize: true } },
      meta: {},
    });
    render(<AcademicTermsPage />);
    await waitFor(() =>
      expect(screen.getByText('academicContext.terms.initialize')).toBeTruthy(),
    );

    cleanup();
    sessionUser.mockReturnValue({
      role: 'admin',
      effective_capabilities: ['academic.context.view'],
      permissions: ['view_classes'],
    });
    fetchTerms.mockResolvedValue({
      success: true,
      data: { terms: [], allowed_actions: { initialize: true } },
      meta: {},
    });
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('academicContext.terms.empty')).toBeTruthy());
    expect(screen.queryByText('academicContext.terms.initialize')).toBeNull();
  });

  it('requires explicit dates and prevents double submit without inventing defaults', async () => {
    const user = userEvent.setup();
    fetchTerms.mockResolvedValue({
      success: true,
      data: { terms: [], allowed_actions: { initialize: true } },
      meta: {},
    });
    initializeTerms.mockResolvedValue({
      success: true,
      data: { terms: [T1, T2] },
      meta: {},
    });

    render(<AcademicTermsPage />);
    await waitFor(() =>
      expect(screen.getByText('academicContext.terms.initialize')).toBeTruthy(),
    );
    await user.click(screen.getByText('academicContext.terms.initialize'));
    expect(screen.getByText('academicContext.terms.datesRequiredExplicit')).toBeTruthy();

    // No default date values invented
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach((input) => {
      expect((input as HTMLInputElement).value).toBe('');
    });

    await user.click(screen.getByText('academicContext.terms.initializeSubmit'));
    expect(toast.error).toHaveBeenCalled();
    expect(initializeTerms).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/term1Start/i), '2026-09-01');
    // labels are translation keys; fill by order
    const dates = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    await user.clear(dates[0]);
    await user.type(dates[0], '2026-09-01');
    await user.type(dates[1], '2027-01-15');
    await user.type(dates[2], '2027-01-16');
    await user.type(dates[3], '2027-06-30');

    await user.click(screen.getByText('academicContext.terms.initializeSubmit'));
    await waitFor(() => expect(initializeTerms).toHaveBeenCalledTimes(1));
    expect(initializeTerms.mock.calls[0][1]).toMatchObject({
      term_1_date_start: '2026-09-01',
      term_1_date_end: '2027-01-15',
      term_2_date_start: '2027-01-16',
      term_2_date_end: '2027-06-30',
    });
  });

  it('shows permission denied without terms capability/view', () => {
    sessionUser.mockReturnValue({
      role: 'admin',
      effective_capabilities: [],
      permissions: [],
    });
    render(<AcademicTermsPage />);
    expect(screen.getByText('admin.pageForbidden')).toBeTruthy();
  });

  it('surfaces conflict errors without optimistic insertion', async () => {
    const user = userEvent.setup();
    fetchTerms.mockResolvedValue({
      success: true,
      data: { terms: [], allowed_actions: { initialize: true } },
      meta: {},
    });
    initializeTerms.mockResolvedValue({
      success: false,
      error: { code: 'terms_configuration_conflict', message: 'conflict' },
      meta: {},
    });
    render(<AcademicTermsPage />);
    await waitFor(() =>
      expect(screen.getByText('academicContext.terms.initialize')).toBeTruthy(),
    );
    await user.click(screen.getByText('academicContext.terms.initialize'));
    const dates = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    await user.type(dates[0], '2026-09-01');
    await user.type(dates[1], '2027-01-15');
    await user.type(dates[2], '2027-01-16');
    await user.type(dates[3], '2027-06-30');
    await user.click(screen.getByText('academicContext.terms.initializeSubmit'));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/terms_configuration_conflict|conflict/),
    );
    expect(screen.queryByText('T1')).toBeNull();
  });
});
