// @vitest-environment happy-dom

/**
 * Teacher Academic Context assignment-scope screen/flow tests.
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { baseOptions } from '@/features/academic-context/test-helpers';
import type { AcademicContextOptionsResponse } from '@/types/academic-context';
import { endpoints } from '@/lib/api/endpoints';

const apiGet = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
    post: vi.fn(),
  },
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

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, vars?: Record<string, string | number>) => {
    if (vars?.language) return `${key}:${vars.language}`;
    if (vars?.count != null) return `${key}:${vars.count}`;
    return key;
  },
}));

vi.mock('@/features/teacher/academic-context/teacher-assignment-scope.css', () => ({}));
vi.mock('@/features/admin/teaching-planning/teaching-planning.css', () => ({}));
vi.mock('@/features/teacher/delivery/delivery.css', () => ({}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/teacher/teaching-planning/distributions',
  useSearchParams: () => new URLSearchParams('tab=overview'),
}));

const useResource = vi.fn();
vi.mock('@/lib/hooks/use-resource', () => ({
  useResource: (...args: unknown[]) => useResource(...args),
}));

vi.mock('@/features/teacher/jathatha/api/teacher-jathatha-api', () => ({
  fetchTeacherSessionOccurrence: vi.fn(),
  fetchTeacherSessionOccurrences: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

vi.mock('@/features/teacher/delivery/api/teacher-delivery-api', () => ({
  fetchTeacherTeachingProgress: vi.fn().mockResolvedValue({ success: true, data: [] }),
  fetchTeacherTeachingProgressSummary: vi.fn().mockResolvedValue({
    success: true,
    data: { lines: 0 },
  }),
}));

vi.mock('@/features/timetable/timetable-view', () => ({
  TimetableView: ({ todayPath, weekPath }: { todayPath: string; weekPath: string }) => (
    <div data-testid="timetable-view" data-today={todayPath} data-week={weekPath} />
  ),
}));

vi.mock('@/features/teacher/jathatha/components/teacher-week-sessions', () => ({
  TeacherWeekSessions: () => <div data-testid="week-sessions" />,
}));

vi.mock('@/features/teacher/delivery/components/teacher-teaching-progress-summary-panel', () => ({
  TeacherTeachingProgressSummaryPanel: () => <div data-testid="progress-summary" />,
}));

vi.mock('@/features/teacher/ui/teacher-primitives', () => ({
  TeacherPageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
  ),
  TeacherWorkspaceCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  TeacherSegmentedTabs: ({ items }: { items: Array<{ key: string; label: string; href: string }> }) => (
    <nav>
      {items.map((item) => (
        <a key={item.key} href={item.href}>
          {item.label}
        </a>
      ))}
    </nav>
  ),
  TeacherEmptyState: ({ title }: { title: string }) => <p>{title}</p>,
  TeacherContentCard: ({ title }: { title: string }) => <article>{title}</article>,
  TeacherSection: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock('@/components/badges/workflow-badge', () => ({
  WorkflowBadge: ({ state }: { state?: string }) => (state ? <span>workflow:{state}</span> : null),
}));

vi.mock('@/components/states/resource', () => ({
  ResourceView: ({
    state,
    children,
    empty,
  }: {
    state: { data?: unknown[]; loading?: boolean; initialLoading?: boolean };
    children: (rows: unknown[]) => React.ReactNode;
    empty: React.ReactNode;
  }) => {
    if (state.initialLoading || (state.loading && !state.data)) return <p>loading</p>;
    if (!state.data || state.data.length === 0) return <>{empty}</>;
    return <>{children(state.data)}</>;
  },
}));

import { renderHook, waitFor as waitForHook } from '@testing-library/react';
import { useAcademicContextOptions } from '@/features/academic-context/hooks/use-academic-context-options';
import { fetchTeacherAcademicContextOptions } from '@/features/academic-context/api/academic-context-api';
import { TeacherAssignmentScopePanel } from '@/features/teacher/academic-context/teacher-assignment-scope-panel';
import TeacherTimetablePage from '@/app/teacher/timetable/page';
import { TeacherAnnualDistributionsList } from '@/features/teacher/teaching-planning/teacher-annual-distributions-list';
import { TeacherTeachingProgressList } from '@/features/teacher/delivery/components/teacher-teaching-progress-list';
import { TeacherSessionHub } from '@/features/teacher/jathatha/components/teacher-session-hub';
import { fetchTeacherSessionOccurrence } from '@/features/teacher/jathatha/api/teacher-jathatha-api';

function ok(data: AcademicContextOptionsResponse) {
  return { success: true as const, data, meta: {} };
}

function assignedOnlyOptions(): AcademicContextOptionsResponse {
  return baseOptions({
    subjects: [
      {
        id: 11,
        name: 'الرياضيات',
        source: 'class',
        level: { id: 5, name: '6AP', display_alias: 'السادس ابتدائي' },
        offering_count: 1,
        ambiguous: false,
      },
    ],
    offerings: [
      {
        id: 100,
        name: 'Math AR',
        display_label: 'الرياضيات — السادس ابتدائي — العربية',
        teaching_language: { id: 9, name: 'العربية', code: 'ar_001' },
        teaching_reference: { id: 200, name: 'المنير في الرياضيات' },
        level: { id: 5, name: '6AP', display_alias: 'السادس ابتدائي' },
        subject: { id: 11, name: 'الرياضيات' },
      },
    ],
    references: [
      {
        id: 200,
        name: 'المنير في الرياضيات',
        version_label: '2026',
        level: { id: 5, name: '6AP', display_alias: 'السادس ابتدائي' },
        teaching_language: { id: 9, name: 'العربية', code: 'ar_001' },
        academic_year: { id: 1, name: '2026-2027' },
        offering_id: 100,
        context_complete: true,
      },
    ],
  });
}

function mockTeacherContext(data: AcademicContextOptionsResponse = assignedOnlyOptions()) {
  apiGet.mockImplementation((path: string) => {
    if (String(path).includes('/teacher/academic-context/options')) {
      return Promise.resolve(ok(data));
    }
    if (String(path).includes('/admin/')) {
      return Promise.resolve({
        success: false,
        error: { code: 'forbidden', message: 'admin blocked' },
        meta: {},
      });
    }
    return Promise.resolve(ok(data));
  });
}

afterEach(() => {
  cleanup();
  apiGet.mockReset();
  useResource.mockReset();
  vi.mocked(fetchTeacherSessionOccurrence).mockReset();
});

beforeEach(() => {
  mockTeacherContext();
  useResource.mockReturnValue({
    data: [],
    loading: false,
    error: null,
    meta: null,
    reload: vi.fn(),
  });
});

describe('Teacher Academic Context client/hook', () => {
  it('calls teacher endpoint with scope/class_id and never admin subjects or school_id', async () => {
    const res = await fetchTeacherAcademicContextOptions({
      scope: 'timetable',
      class_id: 40,
      subject_id: 11,
    });
    expect(res.success).toBe(true);
    expect(apiGet).toHaveBeenCalledWith(
      endpoints.teacher.academicContextOptions,
      expect.objectContaining({
        scope: 'timetable',
        class_id: 40,
        subject_id: 11,
      }),
    );
    const query = apiGet.mock.calls[0][1] as Record<string, unknown>;
    expect(query.school_id).toBeUndefined();
    expect(apiGet.mock.calls[0][0]).toBe('/teacher/academic-context/options');
    expect(apiGet.mock.calls.some((c) => String(c[0]).includes('/admin/subjects'))).toBe(false);
    expect(apiGet.mock.calls.some((c) => String(c[0]).includes('/admin/academic-context'))).toBe(
      false,
    );
  });

  it('useAcademicContextOptions audience=teacher hits teacher fetcher only', async () => {
    const { result } = renderHook(() =>
      useAcademicContextOptions({
        audience: 'teacher',
        scope: 'timetable',
        initialSelection: { classId: '40' },
      }),
    );

    await waitForHook(() => expect(result.current.options || result.current.error).toBeTruthy());
    expect(apiGet).toHaveBeenCalledWith(
      '/teacher/academic-context/options',
      expect.objectContaining({ scope: 'timetable', class_id: 40 }),
    );
    expect(apiGet.mock.calls.some((c) => String(c[0]).includes('/admin/academic-context'))).toBe(
      false,
    );
  });
});

describe('TeacherAssignmentScopePanel negative scope', () => {
  it('shows only assigned subject/offering/reference from teacher response', async () => {
    render(<TeacherAssignmentScopePanel scope="timetable" />);

    expect(await screen.findByText('الرياضيات')).toBeTruthy();
    expect(screen.getByText(/الرياضيات — السادس ابتدائي — العربية/)).toBeTruthy();
    expect(screen.getByText('المنير في الرياضيات')).toBeTruthy();

    expect(screen.queryByText('الفيزياء')).toBeNull();
    expect(screen.queryByText(/Français/)).toBeNull();
    expect(screen.queryByText(/Foreign|مرجع أجنبي/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/res\.lang/i);
    expect(document.body.textContent).not.toMatch(/All Subjects|جميع المواد/i);

    expect(apiGet).toHaveBeenCalledWith(
      '/teacher/academic-context/options',
      expect.objectContaining({ scope: 'timetable' }),
    );
    expect(apiGet.mock.calls.some((c) => String(c[0]).includes('/admin/'))).toBe(false);
  });

  it('shows PermissionDeniedState on 403', async () => {
    apiGet.mockResolvedValue({
      success: false,
      error: { code: 'permission_denied', message: 'Forbidden' },
      meta: {},
    });
    render(<TeacherAssignmentScopePanel scope="timetable" />);
    expect(await screen.findByText('errors.forbiddenTitle')).toBeTruthy();
    expect(screen.getByText('academicContext.permissionDenied')).toBeTruthy();
  });

  it('shows empty assignment state without false empty during loading', async () => {
    let resolveFetch: (value: unknown) => void = () => undefined;
    apiGet.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    render(<TeacherAssignmentScopePanel scope="timetable" />);
    expect(screen.getByText('academicContext.loading')).toBeTruthy();
    expect(screen.queryByText('academicContext.teacherScope.emptyTitle')).toBeNull();

    resolveFetch(ok(baseOptions({ subjects: [], offerings: [], references: [] })));
    expect(await screen.findByText('academicContext.teacherScope.emptyTitle')).toBeTruthy();
  });
});

describe('Teacher timetable page', () => {
  it('renders Teacher Academic Context panel and teacher timetable endpoints without admin fallback', async () => {
    render(<TeacherTimetablePage />);
    expect(await screen.findByText('الرياضيات')).toBeTruthy();
    const view = screen.getByTestId('timetable-view');
    expect(view.getAttribute('data-today')).toBe(endpoints.teacher.timetableToday);
    expect(view.getAttribute('data-week')).toBe(endpoints.teacher.timetableWeek);
    expect(screen.getByTestId('week-sessions')).toBeTruthy();
    expect(screen.getByText('teacher.jathatha.weeklySlotPreview')).toBeTruthy();
    expect(apiGet).toHaveBeenCalledWith(
      '/teacher/academic-context/options',
      expect.objectContaining({ scope: 'timetable' }),
    );
    expect(apiGet.mock.calls.some((c) => String(c[0]).includes('/admin/'))).toBe(false);

    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/app/teacher/timetable/page.tsx'),
      'utf8',
    );
    expect(pageSource).toContain('TeacherAssignmentScopePanel');
    expect(pageSource).not.toMatch(/endpoints\.admin\.subjects|admin\/academic-context/);
  });
});

describe('Teacher Planning surfaces', () => {
  it('distributions list uses teacher endpoint + assignment-scoped academic context', async () => {
    useResource.mockReturnValue({
      data: [
        {
          id: 5,
          name: 'Assigned plan',
          school: { id: 1, name: 'School' },
          academic_year: { id: 2, name: '2026/2027' },
          level: { id: 3, name: 'Level 6' },
          subject: { id: 11, name: 'الرياضيات' },
          teaching_language: null,
          track: null,
          offering: {
            id: 100,
            display_name: 'الرياضيات — السادس ابتدائي — العربية',
            school: { id: 1, name: 'School' },
            academic_year: { id: 2, name: '2026/2027' },
            level: { id: 3, name: 'Level 6' },
            subject: { id: 11, name: 'الرياضيات' },
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
          totals: { line_count: 1, sequence_count: 0, total_sessions: 4 },
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

    render(<TeacherAnnualDistributionsList />);
    expect(useResource).toHaveBeenCalledWith(endpoints.teacher.annualDistributions);
    expect(await screen.findByText('الرياضيات')).toBeTruthy();
    expect(screen.getByText('Assigned plan')).toBeTruthy();
    expect(screen.queryByText('الفيزياء')).toBeNull();
    expect(apiGet).toHaveBeenCalledWith(
      '/teacher/academic-context/options',
      expect.objectContaining({ scope: 'teaching_planning' }),
    );
    expect(apiGet.mock.calls.some((c) => String(c[0]).includes('/admin/'))).toBe(false);
  });

  it('teaching progress list uses teacher scope panel without school-wide options', async () => {
    render(<TeacherTeachingProgressList />);
    expect(await screen.findByText('academicContext.teacherScope.title')).toBeTruthy();
    expect(screen.getByText('الرياضيات')).toBeTruthy();
    expect(screen.queryByText('الفيزياء')).toBeNull();
    expect(apiGet).toHaveBeenCalledWith(
      '/teacher/academic-context/options',
      expect.objectContaining({ scope: 'teaching_planning' }),
    );
    expect(apiGet.mock.calls.some((c) => String(c[0]).includes('/admin/'))).toBe(false);
  });
});

describe('Session Occurrence detail context', () => {
  it('renders occurrence Academic Context without inferring first offering', async () => {
    vi.mocked(fetchTeacherSessionOccurrence).mockResolvedValue({
      success: true,
      data: {
        id: 9,
        date: '2026-07-13',
        start_time: '09:00',
        end_time: '10:00',
        state: 'planned',
        class: { id: 2, name: '6A' },
        subject: { id: 11, name: 'الرياضيات' },
        teacher: { id: 4, name: 'Ada' },
        room: 'B2',
        offering: { id: 100, name: 'الرياضيات — السادس ابتدائي — العربية' },
        track: { id: 7, name: 'French track' },
        teaching_language: { id: 9, name: 'العربية', code: 'ar_001' },
        teaching_reference: { id: 200, name: 'المنير في الرياضيات' },
        distribution: null,
        jathatha_state: 'draft',
        jathatha_review_state: 'reviewed',
        current_jathatha_id: null,
        allowed_actions: {},
      },
      meta: {},
    } as never);

    render(<TeacherSessionHub occurrenceId="9" />);
    expect(await screen.findByRole('heading', { name: 'الرياضيات' })).toBeTruthy();
    expect(screen.getByText('الرياضيات — السادس ابتدائي — العربية')).toBeTruthy();
    expect(screen.getByText('العربية')).toBeTruthy();
    expect(screen.getByText('المنير في الرياضيات')).toBeTruthy();
    expect(screen.getByText('French track')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/res\.lang/i);
    expect(document.body.textContent).not.toMatch(/All Subjects/);
  });

  it('keeps legacy null offering readable and separates Weekly Slot semantics', async () => {
    vi.mocked(fetchTeacherSessionOccurrence).mockResolvedValue({
      success: true,
      data: {
        id: 9,
        date: '2026-07-13',
        start_time: '09:00',
        end_time: '10:00',
        state: 'planned',
        class: { id: 2, name: '6A' },
        subject: { id: 11, name: 'الرياضيات' },
        teacher: null,
        room: null,
        offering: null,
        distribution: null,
        jathatha_state: 'draft',
        jathatha_review_state: 'reviewed',
        current_jathatha_id: null,
        allowed_actions: {},
      },
      meta: {},
    } as never);

    render(<TeacherSessionHub occurrenceId="9" />);
    expect(await screen.findByText('academicContext.hints.legacyMissingOffering')).toBeTruthy();
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/teacher/jathatha/components/teacher-session-hub.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/weekly_slot.*create|TimetableSlotCard/);
  });
});
