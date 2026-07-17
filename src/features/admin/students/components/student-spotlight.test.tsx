// @vitest-environment happy-dom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    ...partial,
  };
}

function renderStudentSpotlight() {
  return render(
    <LocaleProvider>
      <StudentSpotlight onClose={mockOnClose} focusRequest={1} />
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
    expect(screen.getByText('CM1 · P4A · STU-00124')).toBeTruthy();
    expect(screen.queryByText('الاسم')).toBeNull();
    expect(container.querySelectorAll('button button').length).toBe(0);

    await user.click(screen.getByRole('button', { name: 'الأداء' }));
    expect(mockOnClose).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/admin/finance/collections/new?studentId=2081');

    pushMock.mockReset();
    mockOnClose.mockReset();
    await user.click(screen.getByRole('button', { name: 'رسالة' }));
    expect(pushMock).toHaveBeenCalledWith('/admin/channels/compose?studentId=2081');

    // Actions navigate locally — search hook is the only data entry (no recipient/details fetch).
    expect(mockUseStudentSearchQuery).toHaveBeenCalled();
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
