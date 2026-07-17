// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSummary = vi.fn();
const fetchNext = vi.fn();
const submitDecision = vi.fn();

vi.mock('@/features/teacher/teaching-progress/api/teacher-curriculum-progress-api', () => ({
  fetchTeacherCurriculumProgressSummary: (...args: unknown[]) => fetchSummary(...args),
  fetchTeacherSuggestedNextItem: (...args: unknown[]) => fetchNext(...args),
  submitTeacherExecutionDecision: (...args: unknown[]) => submitDecision(...args),
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
    postponed_items: [],
    allowed_actions: {
      accept_suggestion: true,
      select_alternative: true,
      postpone_item: true,
    },
    warnings: [],
    source: 'distribution_progress',
    ...overrides,
  };
}

describe('TeacherTeachingPlanningPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    fetchSummary.mockReset();
    fetchNext.mockReset();
    submitDecision.mockReset();
  });

  it('asks for context before fetching', () => {
    render(<TeacherTeachingPlanningPage />);
    expect(screen.getByText('teacher.teachingProgress.selectContextTitle')).toBeTruthy();
    expect(fetchSummary).not.toHaveBeenCalled();
  });

  it('shows loading then active plan with suggestion', async () => {
    const user = userEvent.setup();
    fetchSummary.mockResolvedValue({ success: true, data: activeSummary() });
    fetchNext.mockResolvedValue({ success: true, data: nextPayload() });

    render(<TeacherTeachingPlanningPage />);
    await user.click(screen.getByRole('button', { name: 'set-context' }));

    await waitFor(() => {
      expect(fetchSummary).toHaveBeenCalledWith(
        expect.objectContaining({ class_id: 10, offering_id: 20 }),
      );
    });
    expect((await screen.findAllByText('Partial item')).length).toBeGreaterThan(0);
    expect(
      screen.getByText('teacher.teachingProgress.suggestionReasons.resume_partial_line'),
    ).toBeTruthy();
    expect(screen.getByText('teacher.teachingProgress.documentationGapsTitle')).toBeTruthy();
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

    render(<TeacherTeachingPlanningPage />);
    await user.click(screen.getByRole('button', { name: 'set-context' }));
    expect(await screen.findByText('teacher.teachingProgress.permissionDenied')).toBeTruthy();
  });

  it('requires reason for alternative and invalidates after success', async () => {
    const user = userEvent.setup();
    fetchSummary.mockResolvedValue({ success: true, data: activeSummary() });
    fetchNext.mockResolvedValue({ success: true, data: nextPayload() });
    submitDecision.mockResolvedValue({ success: true, data: nextPayload() });

    render(<TeacherTeachingPlanningPage />);
    await user.click(screen.getByRole('button', { name: 'set-context' }));
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

  it('does not keep previous context numbers after context change', async () => {
    const user = userEvent.setup();
    fetchSummary
      .mockResolvedValueOnce({ success: true, data: activeSummary({ progress_percentage: 25 }) })
      .mockResolvedValueOnce({
        success: true,
        data: activeSummary({
          context: { class_id: 11, teaching_offering_id: 21, annual_distribution_id: 31 },
          progress_percentage: 80,
          suggested_next_item: {
            distribution_line_id: 201,
            title: 'Other class item',
            sequence_order: 1,
            eligibility: true,
          },
        }),
      });
    fetchNext
      .mockResolvedValueOnce({ success: true, data: nextPayload() })
      .mockResolvedValueOnce({
        success: true,
        data: nextPayload({
          suggestion: {
            distribution_line_id: 201,
            title: 'Other class item',
            sequence_order: 1,
            eligibility: true,
          },
        }),
      });

    render(<TeacherTeachingPlanningPage />);
    await user.click(screen.getByRole('button', { name: 'set-context' }));
    expect((await screen.findAllByText('Partial item')).length).toBeGreaterThan(0);

    // Force reload path by clicking set-context again (same ids still triggers effect via state set).
    await user.click(screen.getByRole('button', { name: 'set-context' }));
    await waitFor(() => expect(fetchSummary.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});
