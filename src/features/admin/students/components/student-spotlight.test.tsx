// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/toast';
import {
  previewStudentAudienceCommunication,
  submitStudentAudienceCommunication,
} from '@/features/communication/api/admin-communication-api';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { StudentSearchHit } from '@/types/student-search';
import { useStudentSearchQuery } from '../hooks/use-student-search-query';
import { StudentSpotlight } from './student-spotlight';

vi.mock('./student-spotlight.css', () => ({}));

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => pushMock(...args),
    replace: vi.fn(),
  }),
}));

vi.mock('../hooks/use-student-search-query', () => ({
  useStudentSearchQuery: vi.fn(),
}));

vi.mock('@/features/communication/api/admin-communication-api', () => ({
  previewStudentAudienceCommunication: vi.fn(),
  submitStudentAudienceCommunication: vi.fn(),
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    id: 1,
    role: 'admin',
    name: 'Admin',
    email: 'a@test.ma',
    admin_kind: 'admin_staff',
    school: { id: 3, name: 'School' },
    permissions: ['view_students', 'view_channels', 'finance.collect_payments'],
  }),
}));

const mockUseStudentSearchQuery = vi.mocked(useStudentSearchQuery);
const mockPreviewStudentAudienceCommunication = vi.mocked(
  previewStudentAudienceCommunication,
);
const mockSubmitStudentAudienceCommunication = vi.mocked(
  submitStudentAudienceCommunication,
);
const mockOnClose = vi.fn();

function sampleHit(partial: Partial<StudentSearchHit> & Pick<StudentSearchHit, 'id'>): StudentSearchHit {
  return {
    code: 'STU-00124',
    level: { id: 1, name: 'CM1' },
    class: { id: 2, name: 'P4A' },
    status: 'active',
    gender: null,
    date_of_birth: null,
    admission_date: null,
    email: null,
    phone: null,
    name_ar: 'إسماعيل العمراني',
    name_latin: 'Ismail Al-Mrani',
    matched_on: 'name',
    parents: [{ id: 9, name: 'ولي التلميذ', phone: '0612345678' }],
    ...partial,
  };
}

function renderStudentSpotlight() {
  return render(
    <LocaleProvider>
      <ToastProvider>
        <StudentSpotlight onClose={mockOnClose} focusRequest={1} />
      </ToastProvider>
    </LocaleProvider>,
  );
}

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'ar');
  mockOnClose.mockReset();
  pushMock.mockReset();
  mockUseStudentSearchQuery.mockReturnValue({
    loading: false,
    error: false,
    results: [],
    suggestion: null,
  });
  mockPreviewStudentAudienceCommunication.mockReset();
  mockPreviewStudentAudienceCommunication.mockResolvedValue({
    ok: true,
    preview: {
      presentation: 'preview',
      recipient_summary: {
        total_people_count: 2,
        deliverable_user_count: 2,
        student_count: 1,
        guardian_count: 1,
        can_submit: true,
      },
    },
  });
  mockSubmitStudentAudienceCommunication.mockReset();
  mockSubmitStudentAudienceCommunication.mockResolvedValue({
    success: true,
    data: {
      id: 90,
      pending_review: false,
      published_message_id: 91,
    },
    meta: {},
  });
});

afterEach(() => {
  cleanup();
});

describe('StudentSpotlight', () => {
  it('exposes did-you-mean suggestion as an accessible button without hidden: true', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    mockUseStudentSearchQuery.mockReturnValue({
      loading: false,
      error: false,
      results: [],
      suggestion: 'ahmed',
    });

    renderStudentSpotlight();

    const dialog = screen.getByRole('dialog', { name: 'Search students' });
    const input = within(dialog).getByRole('searchbox', { name: 'Search students' });
    await userEvent.type(input, 'ahmd');

    const suggestionButton = within(dialog).getByRole('button', {
      name: 'Did you mean: ahmed?',
    });
    expect(suggestionButton).toBeTruthy();

    await userEvent.click(suggestionButton);

    expect((input as HTMLInputElement).value).toBe('ahmed');
  });

  it('closes on Escape', async () => {
    renderStudentSpotlight();

    await userEvent.keyboard('{Escape}');

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders three-line student result and navigates actions without extra search calls', async () => {
    const user = userEvent.setup();
    mockUseStudentSearchQuery.mockReturnValue({
      loading: false,
      error: false,
      results: [sampleHit({ id: 2081 })],
      suggestion: null,
    });

    const { container } = renderStudentSpotlight();

    expect(screen.getByText('تلميذ')).toBeTruthy();
    expect(screen.getByText('إسماعيل العمراني')).toBeTruthy();
    expect(screen.getByText('Ismail Al-Mrani')).toBeTruthy();
    expect(screen.getByText('المستوى:')).toBeTruthy();
    expect(screen.getByText('CM1')).toBeTruthy();
    expect(screen.getByText('القسم:')).toBeTruthy();
    expect(screen.getByText('P4A')).toBeTruthy();
    expect(screen.getByText('هاتف ولي الأمر:')).toBeTruthy();
    expect(screen.getByText('0612345678')).toBeTruthy();
    expect(screen.queryByText('STU-00124')).toBeNull();
    expect(screen.queryByText('الاسم')).toBeNull();
    expect(container.querySelectorAll('button button').length).toBe(0);

    await user.click(screen.getByRole('button', { name: 'الأداء' }));
    expect(mockOnClose).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/admin/finance/collections/new?studentId=2081');

    pushMock.mockReset();
    mockOnClose.mockReset();
    await user.click(screen.getByRole('button', { name: 'رسالة' }));
    expect(pushMock).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();

    const messageDialog = await screen.findByRole('dialog', { name: 'الرسالة' });
    expect(
      messageDialog.closest('.student-spotlight-message-modal__backdrop')?.parentElement,
    ).toBe(document.body);
    expect(within(messageDialog).getByText('إسماعيل العمراني — Ismail Al-Mrani')).toBeTruthy();
    expect(within(messageDialog).getByRole('radio', { name: 'أولياء الأمور' })).toBeTruthy();
    expect(within(messageDialog).getByRole('radio', { name: 'التلاميذ' })).toBeTruthy();
    expect(
      within(messageDialog).getByRole('radio', { name: 'التلاميذ وأولياء الأمور' }),
    ).toBeTruthy();
    expect(mockPreviewStudentAudienceCommunication).not.toHaveBeenCalled();

    await user.click(
      within(messageDialog).getByRole('radio', { name: 'التلاميذ وأولياء الأمور' }),
    );
    await waitFor(() => {
      expect(mockPreviewStudentAudienceCommunication).toHaveBeenCalledWith({
        recipient_scope: {
          scope_type: 'student',
          beneficiary_kind: 'students_and_guardians',
          scope_id: 2081,
        },
      });
    });

    await user.type(within(messageDialog).getByLabelText('الموضوع'), 'متابعة التلميذ');
    await user.type(within(messageDialog).getByLabelText('نص الرسالة'), 'يرجى التواصل مع الإدارة.');
    await user.click(within(messageDialog).getByRole('button', { name: 'إرسال' }));

    await waitFor(() => {
      expect(mockSubmitStudentAudienceCommunication).toHaveBeenCalledWith({
        recipient_scope: {
          scope_type: 'student',
          beneficiary_kind: 'students_and_guardians',
          scope_id: 2081,
        },
        subject: 'متابعة التلميذ',
        body: 'يرجى التواصل مع الإدارة.',
      });
    });
    expect(screen.queryByRole('dialog', { name: 'الرسالة' })).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();

    // The existing Spotlight search hook remains the only student lookup.
    expect(mockUseStudentSearchQuery).toHaveBeenCalled();
  });

  it('keeps keyboard focus inside the quick message modal', async () => {
    const user = userEvent.setup();
    mockUseStudentSearchQuery.mockReturnValue({
      loading: false,
      error: false,
      results: [sampleHit({ id: 2081 })],
      suggestion: null,
    });

    renderStudentSpotlight();
    await user.click(screen.getByRole('button', { name: 'رسالة' }));
    const dialog = await screen.findByRole('dialog', { name: 'الرسالة' });
    const firstAudience = within(dialog).getByRole('radio', { name: 'أولياء الأمور' });
    await waitFor(() => {
      expect(document.activeElement).toBe(firstAudience);
    });

    const closeButton = within(dialog).getByRole('button', { name: 'إغلاق' });
    closeButton.focus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(
      within(dialog).getByRole('button', { name: 'إلغاء' }),
    );
  });

  it('previews each student audience choice through the governed endpoint', async () => {
    const user = userEvent.setup();
    mockUseStudentSearchQuery.mockReturnValue({
      loading: false,
      error: false,
      results: [sampleHit({ id: 2081 })],
      suggestion: null,
    });

    renderStudentSpotlight();
    await user.click(screen.getByRole('button', { name: 'رسالة' }));
    const dialog = await screen.findByRole('dialog', { name: 'الرسالة' });

    for (const [name, beneficiary_kind] of [
      ['أولياء الأمور', 'guardians'],
      ['التلاميذ', 'students'],
      ['التلاميذ وأولياء الأمور', 'students_and_guardians'],
    ] as const) {
      await user.click(within(dialog).getByRole('radio', { name }));
      await waitFor(() => {
        expect(mockPreviewStudentAudienceCommunication).toHaveBeenCalledWith({
          recipient_scope: {
            scope_type: 'student',
            beneficiary_kind,
            scope_id: 2081,
          },
        });
      });
    }
  });

  it('keeps the quick message modal open with its draft when submit fails', async () => {
    const user = userEvent.setup();
    mockUseStudentSearchQuery.mockReturnValue({
      loading: false,
      error: false,
      results: [sampleHit({ id: 2081 })],
      suggestion: null,
    });
    mockSubmitStudentAudienceCommunication.mockResolvedValueOnce({
      success: false,
      error: {
        code: 'network_error',
        message: 'تعذر الوصول إلى الخادم.',
        details: {},
      },
      meta: {},
    });

    renderStudentSpotlight();
    await user.click(screen.getByRole('button', { name: 'رسالة' }));
    const dialog = await screen.findByRole('dialog', { name: 'الرسالة' });
    await user.click(within(dialog).getByRole('radio', { name: 'التلاميذ' }));
    await waitFor(() => {
      expect(within(dialog).getByText('جاهز للإرسال')).toBeTruthy();
    });

    const subject = within(dialog).getByLabelText('الموضوع') as HTMLInputElement;
    const body = within(dialog).getByLabelText('نص الرسالة') as HTMLTextAreaElement;
    await user.type(subject, 'موضوع يبقى');
    await user.type(body, 'نص يبقى عند الخطأ');
    await user.click(within(dialog).getByRole('button', { name: 'إرسال' }));

    await waitFor(() => {
      expect(within(dialog).getByRole('alert')).toBeTruthy();
    });
    expect(subject.value).toBe('موضوع يبقى');
    expect(body.value).toBe('نص يبقى عند الخطأ');
    expect(screen.getByRole('dialog', { name: 'الرسالة' })).toBeTruthy();
    expect(pushMock).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('Escape closes only the quick message modal and keeps Spotlight open', async () => {
    const user = userEvent.setup();
    mockUseStudentSearchQuery.mockReturnValue({
      loading: false,
      error: false,
      results: [sampleHit({ id: 2081 })],
      suggestion: null,
    });

    renderStudentSpotlight();
    await user.click(screen.getByRole('button', { name: 'رسالة' }));
    expect(await screen.findByRole('dialog', { name: 'الرسالة' })).toBeTruthy();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'الرسالة' })).toBeNull();
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(screen.getByRole('searchbox', { name: 'بحث عن تلميذ' })).toBeTruthy();
  });

  it('opens profile on Enter for the active result when focus is not on an action', async () => {
    const user = userEvent.setup();
    mockUseStudentSearchQuery.mockReturnValue({
      loading: false,
      error: false,
      results: [sampleHit({ id: 2081 })],
      suggestion: null,
    });

    renderStudentSpotlight();
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByRole('searchbox');
    input.focus();
    await user.keyboard('{Enter}');

    expect(pushMock).toHaveBeenCalledWith('/admin/students/2081');
    expect(mockOnClose).toHaveBeenCalled();
  });
});
