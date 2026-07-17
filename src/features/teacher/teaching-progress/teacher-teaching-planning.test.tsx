// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSummary = vi.fn();
const fetchNext = vi.fn();
const fetchRemaining = vi.fn();
const submitDecision = vi.fn();
const routerReplace = vi.fn();
const routerPush = vi.fn();
let search = '';

vi.mock('@/features/teacher/teaching-progress/api/teacher-curriculum-progress-api', () => ({
  fetchTeacherCurriculumProgressSummary: (...args: unknown[]) => fetchSummary(...args),
  fetchTeacherSuggestedNextItem: (...args: unknown[]) => fetchNext(...args),
  fetchTeacherCurriculumRemaining: (...args: unknown[]) => fetchRemaining(...args),
  submitTeacherExecutionDecision: (...args: unknown[]) => submitDecision(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace, push: routerPush }),
  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock('@/features/academic-context', () => ({
  AcademicContextFilters: ({
    selection,
    onSelectionChange,
  }: {
    selection: {
      academicYearId: string;
      cycleId: string;
      levelId: string;
      trackId: string;
      teachingLanguageId: string;
      subjectId: string;
      offeringId: string;
      referenceId: string;
      termId: string;
      classId: string;
    };
    onSelectionChange: (next: typeof selection) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onSelectionChange({
            ...selection,
            classId: selection.classId === '10' ? '11' : '10',
            offeringId: selection.offeringId === '20' ? '21' : '20',
          })
        }
      >
        set-context
      </button>
      <span data-testid="ctx">{`${selection.classId}:${selection.offeringId}`}</span>
    </div>
  ),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/features/teacher/delivery/delivery.css', () => ({}));

import { TeacherTeachingPlanningPage } from '@/features/teacher/teaching-progress/components/teacher-teaching-planning-page';

function activeSummary(overrides: Record<string, unknown> = {}) {
  return {
    context: { class_id: 10, teaching_offering_id: 20, annual_distribution_id: 30 },
    total_items: 2,
    completed_items: 0,
    partial_items: 1,
    deferred_items: 0,
    not_started_items: 1,
    remaining_items: 2,
    undocumented_past_sessions: 1,
    progress_percentage: 25,
    earned_units: 0.5,
    total_applicable_units: 2,
    suggestion_reason: 'resume_partial_line',
    suggested_next_item: {
      distribution_line_id: 101,
      title: 'Partial item',
      sequence_order: 1,
      is_partial: true,
      eligibility: true,
      remaining_units: 0.5,
      delivered_session_units: 0.5,
    },
    last_confirmed_delivery: {
      id: 9,
      session_date: '2026-10-01',
      completion_state: 'partial',
      delivered_distribution_line_id: 101,
    },
    lines: [],
    ...overrides,
  };
}

function nextPayload(overrides: Record<string, unknown> = {}) {
  const suggestion = {
    distribution_line_id: 101,
    title: 'Partial item',
    sequence_order: 1,
    is_partial: true,
    eligibility: true,
    remaining_units: 0.5,
    delivered_session_units: 0.5,
  };
  return {
    suggestion,
    suggestion_status: 'suggested',
    suggestion_reason: 'resume_partial_line',
    candidates: [
      suggestion,
      {
        distribution_line_id: 102,
        title: 'Alt item',
        sequence_order: 2,
        eligibility: true,
        remaining_units: 1,
        delivered_session_units: 0,
      },
    ],
    postponed_items: [
      {
        distribution_line_id: 103,
        title: 'Postponed item',
        sequence_order: 3,
        postponed: true,
        eligibility: true,
        latest_postponement_reason: 'Absence',
        remaining_units: 1,
      },
    ],
    allowed_actions: {
      accept_suggestion: true,
      select_alternative: true,
      postpone_item: true,
      choose_postponed: true,
    },
    warnings: [],
    source: 'distribution_progress',
    ...overrides,
  };
}

function remainingItems() {
  return [
    {
      distribution_line_id: 101,
      title: 'Partial item',
      sequence_order: 1,
      is_partial: true,
      eligibility: true,
      remaining_units: 0.5,
      delivered_session_units: 0.5,
    },
    {
      distribution_line_id: 102,
      title: 'Alt item',
      sequence_order: 2,
      eligibility: true,
      remaining_units: 1,
      delivered_session_units: 0,
    },
    {
      distribution_line_id: 103,
      title: 'Postponed item',
      sequence_order: 3,
      postponed: true,
      eligibility: true,
      latest_postponement_reason: 'Absence',
      remaining_units: 1,
      delivered_session_units: 0,
    },
  ];
}

describe('TeacherTeachingPlanningPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    search = '';
  });

  beforeEach(() => {
    fetchSummary.mockReset();
    fetchNext.mockReset();
    fetchRemaining.mockReset();
    submitDecision.mockReset();
    routerReplace.mockReset();
    routerPush.mockReset();
  });

  it('asks for context before fetching', () => {
    render(<TeacherTeachingPlanningPage />);
    expect(screen.getByText('teacher.teachingProgress.selectContextTitle')).toBeTruthy();
    expect(fetchSummary).not.toHaveBeenCalled();
    expect(fetchRemaining).not.toHaveBeenCalled();
  });

  it('hydrates context from query params and fetches remaining', async () => {
    search = 'class_id=10&offering_id=20';
    fetchSummary.mockResolvedValue({ success: true, data: activeSummary() });
    fetchNext.mockResolvedValue({ success: true, data: nextPayload() });
    fetchRemaining.mockResolvedValue({ success: true, data: remainingItems() });

    render(<TeacherTeachingPlanningPage />);

    await waitFor(() => {
      expect(fetchSummary).toHaveBeenCalledWith(
        expect.objectContaining({ class_id: 10, offering_id: 20 }),
      );
      expect(fetchRemaining).toHaveBeenCalledWith(
        expect.objectContaining({ class_id: 10, offering_id: 20 }),
      );
    });
    expect((await screen.findAllByText('Partial item')).length).toBeGreaterThan(0);
    expect(screen.getByText(/Absence/)).toBeTruthy();
  });

  it('shows no-active-plan zero-state without claiming completion', async () => {
    const user = userEvent.setup();
    fetchSummary.mockResolvedValue({
      success: true,
      data: activeSummary({
        context: { class_id: 10, teaching_offering_id: 20, annual_distribution_id: null },
        total_items: 0,
        remaining_items: 0,
        suggestion_reason: 'plan_completed',
        suggested_next_item: null,
      }),
    });
    fetchNext.mockResolvedValue({
      success: false,
      error: { code: 'next_item_active_distribution_required', message: 'no dist' },
    });
    fetchRemaining.mockResolvedValue({ success: true, data: [] });

    render(<TeacherTeachingPlanningPage />);
    await user.click(screen.getByRole('button', { name: 'set-context' }));
    expect(await screen.findByText('teacher.teachingProgress.noActivePlan')).toBeTruthy();
    expect(screen.queryByText('teacher.teachingProgress.suggestionReasons.plan_completed')).toBeNull();
  });

  it('shows permission denied on 403', async () => {
    const user = userEvent.setup();
    fetchSummary.mockResolvedValue({
      success: false,
      error: { code: 'permission_denied', message: 'denied' },
    });
    fetchRemaining.mockResolvedValue({ success: false, error: { code: 'permission_denied', message: 'denied' } });
    fetchNext.mockResolvedValue({ success: false, error: { code: 'permission_denied', message: 'denied' } });

    render(<TeacherTeachingPlanningPage />);
    await user.click(screen.getByRole('button', { name: 'set-context' }));
    expect(await screen.findByText('teacher.teachingProgress.permissionDenied')).toBeTruthy();
  });

  it('accepts suggestion without reason and reloads', async () => {
    search = 'class_id=10&offering_id=20';
    fetchSummary.mockResolvedValue({ success: true, data: activeSummary() });
    fetchNext.mockResolvedValue({ success: true, data: nextPayload() });
    fetchRemaining.mockResolvedValue({ success: true, data: remainingItems() });
    submitDecision.mockResolvedValue({ success: true, data: nextPayload() });

    render(<TeacherTeachingPlanningPage />);
    await screen.findAllByText('Partial item');

    const acceptButtons = screen.getAllByRole('button', {
      name: 'teacher.teachingProgress.actions.acceptSuggestion',
    });
    await userEvent.click(acceptButtons[0]!);

    await waitFor(() => {
      expect(submitDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          decision_type: 'accept_suggestion',
          class_id: 10,
          offering_id: 20,
          distribution_line_id: 101,
        }),
      );
    });
    await waitFor(() => expect(fetchSummary).toHaveBeenCalledTimes(2));
    expect(fetchRemaining).toHaveBeenCalledTimes(2);
  });

  it('chooses postponed item and keeps previous reason visible', async () => {
    search = 'class_id=10&offering_id=20';
    fetchSummary.mockResolvedValue({ success: true, data: activeSummary() });
    fetchNext.mockResolvedValue({ success: true, data: nextPayload() });
    fetchRemaining.mockResolvedValue({ success: true, data: remainingItems() });
    submitDecision.mockResolvedValue({ success: true, data: nextPayload() });

    render(<TeacherTeachingPlanningPage />);
    await screen.findByText('Postponed item');
    expect(screen.getByText(/Absence/)).toBeTruthy();

    const chooseButtons = screen.getAllByRole('button', {
      name: 'teacher.teachingProgress.actions.choosePostponed',
    });
    await userEvent.click(chooseButtons[0]!);

    await waitFor(() => {
      expect(submitDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          decision_type: 'choose_postponed',
        }),
      );
    });
  });

  it('requires reason for alternative and invalidates after success', async () => {
    const user = userEvent.setup();
    search = 'class_id=10&offering_id=20';
    fetchSummary.mockResolvedValue({ success: true, data: activeSummary() });
    fetchNext.mockResolvedValue({ success: true, data: nextPayload() });
    fetchRemaining.mockResolvedValue({ success: true, data: remainingItems() });
    submitDecision.mockResolvedValue({ success: true, data: nextPayload() });

    render(<TeacherTeachingPlanningPage />);
    await screen.findAllByText('Partial item');

    await user.click(screen.getByRole('button', { name: 'teacher.teachingProgress.chooseOther' }));
    expect(
      screen.getByText('teacher.teachingProgress.decision.alternativeTitle'),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'teacher.teachingProgress.decision.save' }));
    expect(
      await screen.findByText('teacher.teachingProgress.decision.reasonRequired'),
    ).toBeTruthy();
    expect(submitDecision).not.toHaveBeenCalled();

    await user.type(
      screen.getByLabelText('teacher.teachingProgress.decision.reasonLabel'),
      'تقديم الدعم',
    );
    await user.click(screen.getByRole('button', { name: 'teacher.teachingProgress.decision.save' }));

    await waitFor(() => {
      expect(submitDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          decision_type: 'select_alternative',
          class_id: 10,
          offering_id: 20,
          reason: 'تقديم الدعم',
        }),
      );
    });
    await waitFor(() => expect(fetchSummary).toHaveBeenCalledTimes(2));
  });

  it('updates URL when context changes', async () => {
    const user = userEvent.setup();
    search = 'class_id=10&offering_id=20';
    fetchSummary.mockResolvedValue({ success: true, data: activeSummary() });
    fetchNext.mockResolvedValue({ success: true, data: nextPayload() });
    fetchRemaining.mockResolvedValue({ success: true, data: remainingItems() });

    render(<TeacherTeachingPlanningPage />);
    await screen.findAllByText('Partial item');
    await user.click(screen.getByRole('button', { name: 'set-context' }));

    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalled();
      const href = String(routerReplace.mock.calls.at(-1)?.[0] ?? '');
      expect(href).toContain('class_id=11');
      expect(href).toContain('offering_id=21');
    });
  });
});
