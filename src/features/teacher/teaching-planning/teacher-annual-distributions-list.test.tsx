// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';

vi.mock('@/features/admin/teaching-planning/teaching-planning.css', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/teacher/teaching-planning/distributions',
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    id: 9,
    name: 'Teacher',
    email: 't@example.com',
    role: 'teacher',
    permissions: [],
    school: { id: 1, name: 'School' },
  }),
}));

vi.mock('@/lib/permissions/academic-context', () => ({
  canViewAcademicContext: () => false,
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      success: true,
      data: {
        subjects: [],
        offerings: [],
        references: [],
        levels: [],
        cycles: [],
        tracks: [],
        teaching_languages: [],
        terms: [],
        classes: [],
        academic_years: [],
        invalidated_selections: [],
        warnings: [],
        language_contract_complete: true,
        selected_context: null,
      },
      meta: {},
    }),
    post: vi.fn(),
  },
}));

vi.mock('@/features/teacher/academic-context/teacher-assignment-scope.css', () => ({}));

const useResource = vi.fn();

vi.mock('@/lib/hooks/use-resource', () => ({
  useResource: (...args: unknown[]) => useResource(...args),
}));

import { TeacherAnnualDistributionsList } from './teacher-annual-distributions-list';

describe('TeacherAnnualDistributionsList', () => {
  beforeEach(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders assigned distributions without mutation controls', () => {
    useResource.mockReturnValue({
      data: [
        {
          id: 5,
          name: 'Active year plan',
          school: { id: 1, name: 'School' },
          academic_year: { id: 2, name: '2026/2027' },
          level: { id: 3, name: 'Level 6' },
          subject: { id: 4, name: 'Math' },
          teaching_language: null,
          track: null,
          offering: {
            id: 7,
            display_name: 'Offering',
            school: { id: 1, name: 'School' },
            academic_year: { id: 2, name: '2026/2027' },
            level: { id: 3, name: 'Level 6' },
            subject: { id: 4, name: 'Math' },
            teaching_language: null,
            track: null,
            reference: null,
            state: 'active',
            active: true,
            effective_from: null,
            effective_to: null,
            assignment_count: 1,
            class_count: 1,
            teacher_count: 1,
            readiness: {
              identity_ready: true,
              reference_ready: true,
              assignments_ready: true,
              assignments_count: 1,
              classes_count: 1,
              teachers_count: 1,
              distribution_ready: true,
              ready_for_approval: true,
              ready_for_activation: true,
              blockers: [],
            },
            activation_blockers: [],
          },
          reference: null,
          period_label: 'Year',
          date_start: null,
          date_end: null,
          state: 'active',
          active: true,
          version_label: 'v1',
          supersedes_id: null,
          totals: { line_count: 3, sequence_count: 2, total_sessions: 12 },
          readiness: {
            has_lines: true,
            sequences_resolved: true,
            dates_valid: true,
            ready_for_approval: true,
            ready_for_activation: true,
            blockers: [],
          },
          allowed_actions: { view: true },
        },
      ],
      loading: false,
      error: null,
      meta: null,
      reload: vi.fn(),
    });

    render(
      <LocaleProvider>
        <TeacherAnnualDistributionsList />
      </LocaleProvider>,
    );

    expect(screen.getByText('Active year plan')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /edit|activate|approve|delete/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /create|new/i })).toBeNull();
  });

  it('shows empty state when backend returns no assigned distributions', () => {
    useResource.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      meta: null,
      reload: vi.fn(),
    });

    render(
      <LocaleProvider>
        <TeacherAnnualDistributionsList />
      </LocaleProvider>,
    );

    expect(screen.getByText(/No distributions available/i)).toBeTruthy();
  });
});
