/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const post = vi.fn();
const successToast = vi.fn();
const errorToast = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
  useLocale: () => ({ locale: 'ar', dir: 'rtl' }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: successToast, error: errorToast, show: vi.fn() }),
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ activeSchoolId: 3, activeAcademicYearId: 12 }),
}));

vi.mock('@/lib/api/client', () => ({
  api: { post },
}));

vi.mock('../hooks/use-student-options', () => ({
  useStudentOptions: () => ({
    loading: false,
    error: null,
    options: {
      levels: [{ id: 77, name: 'السادس', school_id: 3, academic_year_id: 12 }],
    },
  }),
}));

vi.mock('@/features/admin/academic-setup/hooks/use-level-options', () => ({
  useLevelOptions: () => ({
    loading: false,
    error: null,
    options: { reference_levels: [], cycles: [] },
  }),
}));

vi.mock('../utils/student-enrollment-cycle', () => ({
  buildEnrollmentCycleOptions: () => [{ id: '2', name: 'ابتدائي' }],
  filterLevelsByCycleId: (levels: unknown[], cycleId: string) => cycleId ? levels : [],
}));

import { StudentQuickCreateDialog } from './student-quick-create-dialog';

function renderDialog() {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  render(<StudentQuickCreateDialog open onClose={onClose} onCreated={onCreated} />);
  return { onClose, onCreated };
}

function fillAcademicCore(firstName = 'سلمى', lastName = 'العلوي') {
  fireEvent.change(screen.getByLabelText('الاسم الشخصي'), { target: { value: firstName } });
  fireEvent.change(screen.getByLabelText('اسم العائلة'), { target: { value: lastName } });
  fireEvent.change(screen.getByLabelText('admin.studentsList.quickCreate.cycle'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('admin.studentsList.quickCreate.level'), { target: { value: '77' } });
}

describe('StudentQuickCreateDialog', () => {
  beforeEach(() => {
    push.mockReset();
    post.mockReset();
    successToast.mockReset();
    errorToast.mockReset();
  });

  afterEach(() => cleanup());

  it('submits the Arabic quick-registration contract and treats pending post-setup as success', async () => {
    post.mockResolvedValue({ success: true, data: { id: 42, post_setup: { job_id: 8, state: 'pending' } } });
    const { onClose, onCreated } = renderDialog();
    fillAcademicCore();

    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const payload = post.mock.calls[0][1];
    expect(payload.first_name_ar).toBe('سلمى');
    expect(payload.last_name_ar).toBe('العلوي');
    expect(payload).not.toHaveProperty('first_name_fr');
    expect(payload.quick_registration).toMatchObject({
      enabled: true,
      guardian_is_financial_responsible: true,
      create_guardians: [],
      auto_finance_setup: true,
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/students/42'));
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(successToast).toHaveBeenCalled();
  });

  it('save-and-add-another stays open and clears guardian data before the next student', async () => {
    post.mockResolvedValue({ success: true, data: { id: 43, post_setup: { job_id: 9, state: 'pending' } } });
    const { onClose, onCreated } = renderDialog();
    fillAcademicCore();

    fireEvent.click(screen.getByLabelText('إنشاء ولي أمر'));
    fireEvent.change(screen.getByLabelText('الاسم الكامل'), { target: { value: 'أحمد العلوي' } });
    fireEvent.change(screen.getByLabelText('الهاتف'), { target: { value: '0612345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ وإضافة تلميذ آخر' }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][1].quick_registration.create_guardians).toEqual([
      { name: 'أحمد العلوي', phone: '0612345678', relationship_type: 'father' },
    ]);
    await waitFor(() => expect(screen.getByLabelText('الاسم الشخصي')).toHaveValue(''));
    expect(screen.getByLabelText('إنشاء ولي أمر')).not.toBeChecked();
    expect(screen.queryByLabelText('الاسم الكامل')).toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it('keeps entered data and does not navigate when the backend rejects the create', async () => {
    post.mockResolvedValue({ success: false, error: { code: 'validation_error', message: 'رفض الخادم' } });
    const { onClose, onCreated } = renderDialog();
    fillAcademicCore('ليلى', 'المريني');

    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('الاسم الشخصي')).toHaveValue('ليلى');
    expect(screen.getByLabelText('اسم العائلة')).toHaveValue('المريني');
    expect(screen.getByRole('alert').textContent).toContain('رفض الخادم');
    expect(push).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
