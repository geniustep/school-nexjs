// @vitest-environment happy-dom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import { useStudentSearchQuery } from '../hooks/use-student-search-query';
import { StudentSpotlight } from './student-spotlight';

vi.mock('./student-spotlight.css', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock('../hooks/use-student-search-query', () => ({
  useStudentSearchQuery: vi.fn(),
}));

const mockUseStudentSearchQuery = vi.mocked(useStudentSearchQuery);

const mockOnClose = vi.fn();

function renderStudentSpotlight() {
  return render(
    <LocaleProvider>
      <StudentSpotlight onClose={mockOnClose} focusRequest={1} />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  mockOnClose.mockReset();
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
});
