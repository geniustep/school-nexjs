// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchTerms = vi.fn();
const initializeTerms = vi.fn();
const updateTerm = vi.fn();
const createTerm = vi.fn();
const toast = { success: vi.fn(), error: vi.fn() };
const sessionUser = vi.fn();

vi.mock('@/features/academic-context/api/academic-context-api', () => ({
  fetchAcademicYearTerms: (...args: unknown[]) => fetchTerms(...args),
  initializeAcademicYearTerms: (...args: unknown[]) => initializeTerms(...args),
  updateAcademicTerm: (...args: unknown[]) => updateTerm(...args),
  createAcademicTerm: (...args: unknown[]) => createTerm(...args),
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

const DRAFT = {
  id: 31,
  name: 'الدورة الأولى',
  code: 'T1',
  sequence: 1,
  date_start: '2026-09-01',
  date_end: '2027-01-15',
  state: 'draft',
  active: true,
  allowed_actions: { edit: true, edit_identity: true, edit_dates: true },
  academic_year: { id: 1, name: '2026-2027' },
};

const ACTIVE = {
  ...DRAFT,
  id: 32,
  name: 'الدورة الثانية',
  code: 'T2',
  state: 'active',
  allowed_actions: { edit: false, edit_dates: true, edit_identity: false },
  date_start: '2027-01-16',
  date_end: '2027-06-30',
};

const COMPLETED = {
  ...DRAFT,
  id: 33,
  name: 'دورة منتهية',
  code: 'T0',
  state: 'done',
  allowed_actions: { edit: false, edit_dates: false, edit_identity: false },
};

afterEach(() => {
  cleanup();
  fetchTerms.mockReset();
  initializeTerms.mockReset();
  updateTerm.mockReset();
  createTerm.mockReset();
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
    data: { terms: [DRAFT], allowed_actions: { initialize: false } },
    meta: {},
  });
});

describe('AcademicTermsPage draft edit', () => {
  it('shows edit for draft with manage + allowed_actions.edit=true', async () => {
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('الدورة الأولى')).toBeTruthy());
    expect(screen.getAllByText('academicContext.terms.edit').length).toBe(1);
  });

  it('hides edit when allowed_actions.edit=false and no edit_dates', async () => {
    fetchTerms.mockResolvedValue({
      success: true,
      data: {
        terms: [{ ...DRAFT, allowed_actions: { edit: false } }],
        allowed_actions: { initialize: false },
      },
      meta: {},
    });
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('الدورة الأولى')).toBeTruthy());
    expect(screen.queryByText('academicContext.terms.edit')).toBeNull();
  });

  it('shows edit for confirmed active terms and hides for done', async () => {
    fetchTerms.mockResolvedValue({
      success: true,
      data: { terms: [ACTIVE, COMPLETED], allowed_actions: { initialize: false } },
      meta: {},
    });
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('الدورة الثانية')).toBeTruthy());
    expect(screen.getAllByText('academicContext.terms.edit').length).toBe(1);
  });

  it('hides edit without academic.terms.manage', async () => {
    sessionUser.mockReturnValue({
      role: 'admin',
      effective_capabilities: ['academic.context.view'],
      permissions: ['view_classes'],
    });
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('الدورة الأولى')).toBeTruthy());
    expect(screen.queryByText('academicContext.terms.edit')).toBeNull();
  });

  it('keeps date fields editable for confirmed terms and locks identity', async () => {
    const user = userEvent.setup();
    fetchTerms.mockResolvedValue({
      success: true,
      data: { terms: [ACTIVE], allowed_actions: { initialize: false } },
      meta: {},
    });
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('academicContext.terms.edit')).toBeTruthy());
    await user.click(screen.getByText('academicContext.terms.edit'));

    const nameInput = screen.getByLabelText('academicContext.terms.editName') as HTMLInputElement;
    const codeInput = screen.getByLabelText('academicContext.terms.editCode') as HTMLInputElement;
    const start = screen.getByLabelText('academicContext.terms.editDateStart') as HTMLInputElement;
    const end = screen.getByLabelText('academicContext.terms.editDateEnd') as HTMLInputElement;

    expect(nameInput.readOnly).toBe(true);
    expect(codeInput.readOnly).toBe(true);
    expect(start.disabled).toBe(false);
    expect(end.disabled).toBe(false);

    await user.clear(start);
    await user.type(start, '2027-01-20');
    await user.clear(end);
    await user.type(end, '2027-06-20');

    updateTerm.mockResolvedValue({
      success: true,
      data: { ...ACTIVE, date_start: '2027-01-20', date_end: '2027-06-20', state: 'active' },
      meta: {},
    });
    await user.click(screen.getByText('academicContext.terms.saveEdit'));
    await waitFor(() => expect(updateTerm).toHaveBeenCalledTimes(1));
    expect(updateTerm.mock.calls[0][1]).toEqual({
      date_start: '2027-01-20',
      date_end: '2027-06-20',
    });
    expect(updateTerm.mock.calls[0][1]).not.toHaveProperty('state');
    expect(updateTerm.mock.calls[0][1]).not.toHaveProperty('name');
  });

  it('opens create dialog and posts create payload then refreshes list', async () => {
    const user = userEvent.setup();
    fetchTerms
      .mockResolvedValueOnce({
        success: true,
        data: { terms: [], allowed_actions: { initialize: true } },
        meta: {},
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          terms: [
            {
              id: 99,
              name: 'دورة جديدة',
              code: 'TX',
              date_start: '2026-09-01',
              date_end: '2026-12-31',
              state: 'draft',
              allowed_actions: { edit: true, edit_identity: true, edit_dates: true },
            },
          ],
          allowed_actions: { initialize: false },
        },
        meta: {},
      });
    createTerm.mockResolvedValue({
      success: true,
      data: {
        id: 99,
        name: 'دورة جديدة',
        code: 'TX',
        date_start: '2026-09-01',
        date_end: '2026-12-31',
        state: 'draft',
      },
      meta: {},
    });

    render(<AcademicTermsPage />);
    await waitFor(() =>
      expect(screen.getAllByText('academicContext.terms.create').length).toBeGreaterThan(0),
    );
    await user.click(screen.getAllByText('academicContext.terms.create')[0]);
    expect(screen.getByText('academicContext.terms.createTitle')).toBeTruthy();

    await user.type(screen.getByLabelText('academicContext.terms.editName'), 'دورة جديدة');
    await user.type(screen.getByLabelText('academicContext.terms.editCode'), 'TX');
    await user.type(screen.getByLabelText('academicContext.terms.editDateStart'), '2026-09-01');
    await user.type(screen.getByLabelText('academicContext.terms.editDateEnd'), '2026-12-31');
    await user.click(screen.getByText('academicContext.terms.createSubmit'));

    await waitFor(() => expect(createTerm).toHaveBeenCalledTimes(1));
    expect(createTerm.mock.calls[0][0]).toBe('1');
    expect(createTerm.mock.calls[0][1]).toEqual({
      name: 'دورة جديدة',
      code: 'TX',
      date_start: '2026-09-01',
      date_end: '2026-12-31',
    });
    expect(createTerm.mock.calls[0][1]).not.toHaveProperty('school_id');
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('دورة جديدة')).toBeTruthy());
  });

  it('opens form with current values and only the four editable fields', async () => {
    const user = userEvent.setup();
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('academicContext.terms.edit')).toBeTruthy());
    await user.click(screen.getByText('academicContext.terms.edit'));

    expect(screen.getByText('academicContext.terms.editTitle')).toBeTruthy();
    expect((screen.getByLabelText('academicContext.terms.editName') as HTMLInputElement).value).toBe(
      'الدورة الأولى',
    );
    expect((screen.getByLabelText('academicContext.terms.editCode') as HTMLInputElement).value).toBe(
      'T1',
    );
    expect(
      (screen.getByLabelText('academicContext.terms.editDateStart') as HTMLInputElement).value,
    ).toBe('2026-09-01');
    expect(
      (screen.getByLabelText('academicContext.terms.editDateEnd') as HTMLInputElement).value,
    ).toBe('2027-01-15');

    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelectorAll('input').length).toBe(4);
    expect(dialog.querySelector('input[name="state"]')).toBeNull();
    expect(dialog.querySelector('input[name="school_id"]')).toBeNull();
    expect(dialog.querySelector('input[name="academic_year_id"]')).toBeNull();
    expect(dialog.querySelector('input[name="active"]')).toBeNull();
  });

  it('rejects blank name after trim', async () => {
    const user = userEvent.setup();
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('academicContext.terms.edit')).toBeTruthy());
    await user.click(screen.getByText('academicContext.terms.edit'));
    const nameInput = screen.getByLabelText('academicContext.terms.editName');
    await user.clear(nameInput);
    await user.type(nameInput, '   ');
    await user.click(screen.getByText('academicContext.terms.saveEdit'));
    expect(screen.getByRole('alert').textContent).toContain(
      'academicContext.terms.editNameRequired',
    );
    expect(updateTerm).not.toHaveBeenCalled();
  });

  it('rejects blank code after trim', async () => {
    const user = userEvent.setup();
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('academicContext.terms.edit')).toBeTruthy());
    await user.click(screen.getByText('academicContext.terms.edit'));
    const codeInput = screen.getByLabelText('academicContext.terms.editCode');
    await user.clear(codeInput);
    await user.type(codeInput, '  ');
    await user.click(screen.getByText('academicContext.terms.saveEdit'));
    expect(screen.getByRole('alert').textContent).toContain(
      'academicContext.terms.editCodeRequired',
    );
    expect(updateTerm).not.toHaveBeenCalled();
  });

  it('rejects missing dates and equal/inverted ranges', async () => {
    const user = userEvent.setup();
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('academicContext.terms.edit')).toBeTruthy());
    await user.click(screen.getByText('academicContext.terms.edit'));

    const start = screen.getByLabelText('academicContext.terms.editDateStart');
    const end = screen.getByLabelText('academicContext.terms.editDateEnd');

    await user.clear(start);
    await user.click(screen.getByText('academicContext.terms.saveEdit'));
    expect(screen.getByRole('alert').textContent).toContain(
      'academicContext.terms.editDateStartRequired',
    );

    await user.type(start, '2026-09-01');
    await user.clear(end);
    await user.click(screen.getByText('academicContext.terms.saveEdit'));
    expect(screen.getByRole('alert').textContent).toContain(
      'academicContext.terms.editDateEndRequired',
    );

    await user.type(end, '2026-09-01');
    await user.click(screen.getByText('academicContext.terms.saveEdit'));
    expect(screen.getByRole('alert').textContent).toContain(
      'academicContext.errors.term_dates_invalid',
    );

    await user.clear(end);
    await user.type(end, '2026-08-01');
    await user.click(screen.getByText('academicContext.terms.saveEdit'));
    expect(screen.getByRole('alert').textContent).toContain(
      'academicContext.errors.term_dates_invalid',
    );
    expect(updateTerm).not.toHaveBeenCalled();
  });

  it('PATCHes allowed fields only and updates row from server response', async () => {
    const user = userEvent.setup();
    updateTerm.mockResolvedValue({
      success: true,
      data: {
        ...DRAFT,
        name: 'دورة محدثة',
        allowed_actions: { edit: true, edit_identity: true, edit_dates: true },
      },
      meta: {},
    });

    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('academicContext.terms.edit')).toBeTruthy());
    await user.click(screen.getByText('academicContext.terms.edit'));
    const nameInput = screen.getByLabelText('academicContext.terms.editName');
    await user.clear(nameInput);
    await user.type(nameInput, 'دورة محدثة');
    await user.click(screen.getByText('academicContext.terms.saveEdit'));

    await waitFor(() => expect(updateTerm).toHaveBeenCalledTimes(1));
    expect(updateTerm.mock.calls[0][0]).toBe(31);
    expect(updateTerm.mock.calls[0][1]).toEqual({ name: 'دورة محدثة' });
    expect(updateTerm.mock.calls[0][1]).not.toHaveProperty('state');
    expect(updateTerm.mock.calls[0][1]).not.toHaveProperty('school_id');
    expect(updateTerm.mock.calls[0][1]).not.toHaveProperty('academic_year_id');
    expect(updateTerm.mock.calls[0][1]).not.toHaveProperty('active');

    await waitFor(() => expect(screen.getByText('دورة محدثة')).toBeTruthy());
    expect(screen.queryByText('academicContext.terms.editTitle')).toBeNull();
    expect(toast.success).toHaveBeenCalledWith('academicContext.terms.editSuccess');
  });

  it('prevents duplicate submit while saving', async () => {
    const user = userEvent.setup();
    let resolveUpdate: ((value: unknown) => void) | undefined;
    updateTerm.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('academicContext.terms.edit')).toBeTruthy());
    await user.click(screen.getByText('academicContext.terms.edit'));
    const nameInput = screen.getByLabelText('academicContext.terms.editName');
    await user.clear(nameInput);
    await user.type(nameInput, 'اسم جديد');

    const saveBtn = screen.getByText('academicContext.terms.saveEdit');
    await user.click(saveBtn);
    await waitFor(() => expect(updateTerm).toHaveBeenCalledTimes(1));
    const busyBtn = screen.getByRole('button', { name: 'common.submitting' }) as HTMLButtonElement;
    expect(busyBtn.disabled).toBe(true);
    await user.click(busyBtn);
    expect(updateTerm).toHaveBeenCalledTimes(1);

    resolveUpdate?.({
      success: true,
      data: {
        ...DRAFT,
        name: 'اسم جديد',
        allowed_actions: { edit: true, edit_identity: true, edit_dates: true },
      },
      meta: {},
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it.each([
    ['term_edit_not_allowed'],
    ['term_not_found'],
    ['term_dates_invalid'],
    ['term_dates_outside_academic_year'],
    ['term_dates_overlap'],
    ['term_code_conflict'],
    ['unknown_failure'],
  ])('keeps dialog open and values on API error %s', async (code) => {
    const user = userEvent.setup();
    updateTerm.mockResolvedValue({
      success: false,
      error: { code, message: 'fail', details: { status: code === 'term_code_conflict' ? 409 : 422 } },
      meta: {},
    });

    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('academicContext.terms.edit')).toBeTruthy());
    await user.click(screen.getByText('academicContext.terms.edit'));
    const nameInput = screen.getByLabelText('academicContext.terms.editName') as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'قيمة محفوظة');
    await user.click(screen.getByText('academicContext.terms.saveEdit'));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText('academicContext.terms.editTitle')).toBeTruthy();
    expect(nameInput.value).toBe('قيمة محفوظة');
    expect(toast.success).not.toHaveBeenCalled();

    const expectedKey =
      code === 'unknown_failure'
        ? 'academicContext.errors.term_edit_failed'
        : `academicContext.errors.${code}`;
    expect(screen.getByRole('alert').textContent).toContain(expectedKey);
  });

  it('does not change initialize flow when terms already exist', async () => {
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('الدورة الأولى')).toBeTruthy());
    expect(screen.queryByText('academicContext.terms.initialize')).toBeNull();
    expect(initializeTerms).not.toHaveBeenCalled();
  });

  it('compatibility fallback without allowed_actions still requires capability', async () => {
    fetchTerms.mockResolvedValue({
      success: true,
      data: {
        terms: [{ ...DRAFT, allowed_actions: undefined }],
        allowed_actions: { initialize: false },
      },
      meta: {},
    });
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('academicContext.terms.edit')).toBeTruthy());

    cleanup();
    sessionUser.mockReturnValue({
      role: 'admin',
      effective_capabilities: ['academic.context.view'],
      permissions: ['view_classes'],
    });
    fetchTerms.mockResolvedValue({
      success: true,
      data: {
        terms: [{ ...DRAFT, allowed_actions: undefined }],
        allowed_actions: { initialize: false },
      },
      meta: {},
    });
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('الدورة الأولى')).toBeTruthy());
    expect(screen.queryByText('academicContext.terms.edit')).toBeNull();
  });

  it('keeps sequence and active columns visible in the table', async () => {
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('الدورة الأولى')).toBeTruthy());
    expect(screen.getByText('academicContext.terms.sequence')).toBeTruthy();
    expect(screen.getByText('academicContext.terms.active')).toBeTruthy();
  });
});

describe('AcademicTermsPage initialize (unchanged)', () => {
  it('lists T1/T2 as returned by Backend and hides Initialize when terms exist', async () => {
    fetchTerms.mockResolvedValue({
      success: true,
      data: {
        terms: [
          { ...ACTIVE, id: 31, code: 'T1', name: 'الدورة الأولى' },
          { ...ACTIVE, id: 32, code: 'T2', name: 'الدورة الثانية' },
        ],
        allowed_actions: { initialize: false },
      },
      meta: {},
    });
    render(<AcademicTermsPage />);
    await waitFor(() => expect(screen.getByText('الدورة الأولى')).toBeTruthy());
    expect(screen.getByText('T1')).toBeTruthy();
    expect(screen.getByText('T2')).toBeTruthy();
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
  });
});
