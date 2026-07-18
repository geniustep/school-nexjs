// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import { MASTERY_BATCH_LIMIT } from '@/types/teaching-assessment-support';

const replace = vi.fn();
const searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => searchParams,
}));

vi.mock('@/features/academic-context', () => ({
  AcademicContextFilters: () => <div data-testid="context-filters" />,
}));

vi.mock('@/features/teacher/delivery/delivery.css', () => ({}));
vi.mock('@/features/teacher/teaching-assessment-support/assessment-support.css', () => ({}));

const reload = vi.fn();
const hookState = {
  objectives: { data: null, loading: false, error: null },
  scale: { data: null, loading: false, error: null },
  matrix: { data: null, loading: false, error: null },
  difficulties: { data: null, loading: false, error: null },
  decisions: { data: null, loading: false, error: null },
  groups: { data: null, loading: false, error: null },
  plans: { data: null, loading: false, error: null },
  reassessments: { data: null, loading: false, error: null },
  reload,
  clearAll: vi.fn(),
};

vi.mock('@/features/teacher/teaching-assessment-support/hooks/use-teacher-assessment-support', () => ({
  useTeacherAssessmentSupport: (opts: { enabled: boolean }) => {
    if (!opts.enabled) {
      return { ...hookState, matrix: { data: null, loading: false, error: null } };
    }
    return hookState;
  },
}));

import { TeacherAssessmentSupportPage } from './components/teacher-assessment-support-page';
import { MasteryMatrixPanel } from './components/mastery-matrix-panel';

describe('TeacherAssessmentSupportPage', () => {
  beforeEach(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    searchParams.forEach((_, key) => searchParams.delete(key));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('asks for context before loading operational data', () => {
    render(
      <LocaleProvider>
        <TeacherAssessmentSupportPage />
      </LocaleProvider>,
    );
    expect(screen.getByText(/Select context/i)).toBeTruthy();
  });
});

describe('MasteryMatrixPanel batch guards', () => {
  afterEach(() => {
    cleanup();
  });

  it('exposes batch limit constant used by UI', () => {
    expect(MASTERY_BATCH_LIMIT).toBe(500);
  });

  it('shows waiting-for-scale empty state without inventing levels', () => {
    render(
      <LocaleProvider>
        <MasteryMatrixPanel
          matrix={{
            school_id: 1,
            academic_year_id: 2,
            class_id: 3,
            subject_id: 4,
            students: [{ id: 1, name: 'A' }],
            objectives: [{ id: 9, code: 'LO', name: 'Obj' }],
            cells: [],
            cell_count: 0,
          }}
          scale={null}
          loading={false}
          error={null}
          context={{ academicYearId: 2, classId: 3, subjectId: 4 }}
          onSaved={() => undefined}
        />
      </LocaleProvider>,
    );
    expect(screen.getByText(/No active mastery scale/i)).toBeTruthy();
  });
});
