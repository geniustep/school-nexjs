// @vitest-environment happy-dom

import { cleanup, render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { StudentSearchHit } from '@/types/student-search';
import { useStudentSearchPicker } from '../hooks/use-student-search-picker';
import {
  filterExcludedStudentSearchHits,
  resolveStudentSearchPickerViewState,
  type StudentSearchPickerViewState,
} from '../utils/student-search-picker-utils';
import { StudentSearchPicker } from './student-search-picker';

vi.mock('./student-search-picker.css', () => ({}));

vi.mock('../hooks/use-student-search-picker', () => ({
  useStudentSearchPicker: vi.fn(),
}));

type MockHookOptions = {
  excludeStudentIds?: number[];
  disabled?: boolean;
};

type MockHookControl = {
  query: string;
  allResults: StudentSearchHit[];
  suggestion: string | null;
  loading: boolean;
  error: boolean;
  viewStateOverride?: StudentSearchPickerViewState;
};

const mockControl: MockHookControl = {
  query: '',
  allResults: [],
  suggestion: null,
  loading: false,
  error: false,
};

const mockSetQuery = vi.fn((nextQuery: string) => {
  mockControl.query = nextQuery;
  rerenderPicker?.();
});

const mockClearQuery = vi.fn(() => {
  mockControl.query = '';
  rerenderPicker?.();
});

const mockApplySuggestion = vi.fn((nextQuery: string) => {
  mockControl.query = nextQuery;
  rerenderPicker?.();
});

let rerenderPicker: (() => void) | undefined;

function buildMockHookReturn(options?: MockHookOptions) {
  const visibleResults = filterExcludedStudentSearchHits(
    mockControl.allResults,
    options?.excludeStudentIds,
  );
  const viewState =
    mockControl.viewStateOverride ??
    resolveStudentSearchPickerViewState({
      query: mockControl.query,
      loading: mockControl.loading,
      error: mockControl.error,
      resultCount: visibleResults.length,
      suggestion: mockControl.suggestion,
      disabled: options?.disabled,
    });

  return {
    query: mockControl.query,
    setQuery: mockSetQuery,
    clearQuery: mockClearQuery,
    applySuggestion: mockApplySuggestion,
    visibleResults,
    suggestion: mockControl.suggestion,
    loading: mockControl.loading,
    error: mockControl.error,
    viewState,
  };
}

function sampleHit(
  partial: Partial<StudentSearchHit> & Pick<StudentSearchHit, 'id' | 'full_name'>,
): StudentSearchHit {
  return {
    code: `S${partial.id}`,
    level: 'Grade 6',
    class: '6A',
    status: 'active',
    gender: null,
    date_of_birth: null,
    admission_date: null,
    email: null,
    phone: null,
    matched_on: 'name',
    ...partial,
  };
}

const ahmed = sampleHit({ id: 1, full_name: 'Ahmed Alawi' });
const sara = sampleHit({ id: 2, full_name: 'Sara Benali' });
const karim = sampleHit({ id: 3, full_name: 'Karim Idrissi' });

function renderStudentSearchPicker(
  props: Partial<ComponentProps<typeof StudentSearchPicker>> = {},
) {
  const onSelect = vi.fn<(student: StudentSearchHit) => void>();
  const view = render(
    <LocaleProvider>
      <StudentSearchPicker onSelect={onSelect} {...props} />
    </LocaleProvider>,
  );
  rerenderPicker = () => {
    view.rerender(
      <LocaleProvider>
        <StudentSearchPicker onSelect={onSelect} {...props} />
      </LocaleProvider>,
    );
  };
  return { onSelect, ...view };
}

function getSearchInput() {
  return screen.getByRole('combobox');
}

function openResultList() {
  fireEvent.focus(getSearchInput());
}

beforeEach(() => {
  vi.clearAllMocks();
  rerenderPicker = undefined;
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  mockControl.query = '';
  mockControl.allResults = [];
  mockControl.suggestion = null;
  mockControl.loading = false;
  mockControl.error = false;
  mockControl.viewStateOverride = undefined;
  Element.prototype.scrollIntoView = vi.fn();

  vi.mocked(useStudentSearchPicker).mockImplementation((options) =>
    buildMockHookReturn(options),
  );
});

afterEach(() => {
  cleanup();
});

describe('StudentSearchPicker component interactions', () => {
  it('forwards typed query through setQuery and shows loading state', async () => {
    mockControl.query = 'ah';
    mockControl.loading = true;
    mockControl.viewStateOverride = 'loading';

    renderStudentSearchPicker();
    openResultList();

    expect(await screen.findByText(/Searching/i)).toBeTruthy();
    expect((getSearchInput() as HTMLInputElement).value).toBe('ah');

    const user = userEvent.setup();
    await user.type(getSearchInput(), 'm');
    expect(mockSetQuery).toHaveBeenCalled();
  });

  it('renders visible results after search resolves', async () => {
    mockControl.query = 'ahmed';
    mockControl.allResults = [ahmed, sara, karim];

    renderStudentSearchPicker();
    openResultList();

    expect(await screen.findByRole('listbox')).toBeTruthy();
    expect(screen.getByRole('option', { name: /Ahmed Alawi/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Sara Benali/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Karim Idrissi/i })).toBeTruthy();
  });

  it('moves keyboard focus with ArrowDown and ArrowUp', () => {
    mockControl.query = 'student';
    mockControl.allResults = [ahmed, sara, karim];

    renderStudentSearchPicker();
    openResultList();

    const options = () => screen.getAllByRole('option');
    expect(options()[0].getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(getSearchInput(), { key: 'ArrowDown' });
    expect(options()[1].getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(getSearchInput(), { key: 'ArrowUp' });
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
  });

  it('selects the active student on Enter', () => {
    mockControl.query = 'student';
    mockControl.allResults = [ahmed, sara, karim];
    const { onSelect } = renderStudentSearchPicker();
    openResultList();

    fireEvent.keyDown(getSearchInput(), { key: 'ArrowDown' });
    fireEvent.keyDown(getSearchInput(), { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 2, full_name: 'Sara Benali' }));
    expect(mockClearQuery).toHaveBeenCalled();
  });

  it('selects a student when a result row is clicked', () => {
    mockControl.query = 'karim';
    mockControl.allResults = [ahmed, sara, karim];
    const { onSelect } = renderStudentSearchPicker();
    openResultList();

    fireEvent.click(screen.getByRole('option', { name: /Karim Idrissi/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 3, full_name: 'Karim Idrissi' }));
  });

  it('closes the list on Escape without selecting', () => {
    mockControl.query = 'student';
    mockControl.allResults = [ahmed, sara];
    const { onSelect } = renderStudentSearchPicker();
    openResultList();

    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.keyDown(getSearchInput(), { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('hides excluded student ids from rendered options', () => {
    mockControl.query = 'student';
    mockControl.allResults = [ahmed, sara, karim];

    renderStudentSearchPicker({ excludeStudentIds: [2] });
    openResultList();

    expect(screen.getByRole('option', { name: /Ahmed Alawi/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Karim Idrissi/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Sara Benali/i })).toBeNull();
    expect(useStudentSearchPicker).toHaveBeenCalledWith(
      expect.objectContaining({ excludeStudentIds: [2] }),
    );
  });

  it('shows a no-match state when search returns zero hits', async () => {
    mockControl.query = 'missing';
    mockControl.allResults = [];

    renderStudentSearchPicker();
    openResultList();

    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText(/No matching students/i)).toBeTruthy();
  });

  it('shows did-you-mean without auto-applying until the suggestion is clicked', async () => {
    mockControl.query = 'ahmd';
    mockControl.allResults = [];
    mockControl.suggestion = 'ahmed';
    mockControl.viewStateOverride = 'empty-with-suggestion';

    renderStudentSearchPicker();
    openResultList();

    expect((getSearchInput() as HTMLInputElement).value).toBe('ahmd');
    const listbox = await screen.findByRole('listbox');
    const suggestionButton = within(listbox).getByRole('button', {
      name: 'Did you mean: ahmed?',
    });
    expect(suggestionButton).toBeTruthy();
    expect(mockApplySuggestion).not.toHaveBeenCalled();

    await userEvent.click(suggestionButton);

    expect(mockApplySuggestion).toHaveBeenCalledTimes(1);
    expect(mockApplySuggestion).toHaveBeenCalledWith('ahmed');
    expect((getSearchInput() as HTMLInputElement).value).toBe('ahmed');
  });
});
