import { describe, expect, it } from 'vitest';
import {
  normalizeTeachingProgressSummary,
  normalizeTeachingTeacherNextItemPayload,
  normalizeTeachingRemainingItem,
} from '@/features/admin/teaching-planning/utils/normalize-teaching-delivery';
import {
  displayProgressPercentage,
  formatProgressPercentage,
  hasActiveCurriculumPlan,
  resolveCurriculumPlanState,
} from '@/features/teaching-progress/progress-plan-state';
import {
  isKnownSuggestionReason,
  suggestionReasonMessageKey,
} from '@/features/teaching-progress/suggestion-reason';

describe('curriculum progress contract normalization', () => {
  it('normalizes an active-plan payload without recomputing percentage', () => {
    const summary = normalizeTeachingProgressSummary({
      context: {
        class_id: 10,
        teaching_offering_id: 20,
        annual_distribution_id: 30,
      },
      progress_percentage: 42.5,
      coverage_percent: 99,
      total_items: 4,
      completed_items: 1,
      partial_items: 1,
      deferred_items: 1,
      not_started_items: 1,
      remaining_items: 3,
      undocumented_past_sessions: 2,
      earned_units: 1.5,
      total_applicable_units: 4,
      suggestion_reason: 'resume_partial_line',
      suggested_next_item: {
        distribution_line_id: 101,
        title: 'عنصر جزئي',
        sequence_order: 2,
        is_partial: true,
        remaining_units: 0.5,
      },
      last_confirmed_delivery: {
        id: 9,
        session_date: '2026-10-12',
        completion_state: 'partial',
        delivered_distribution_line_id: 101,
      },
      weight_basis: 'planned_session_count',
      item_bucket_contract: 'mutually_exclusive',
    });

    expect(summary.progress_percentage).toBe(42.5);
    expect(summary.coverage_percent).toBe(42.5);
    expect(summary.partial_items).toBe(1);
    expect(summary.remaining_items).toBe(3);
    expect(summary.undocumented_past_sessions).toBe(2);
    expect(summary.suggested_next_item?.distribution_line_id).toBe(101);
    expect(summary.context?.annual_distribution_id).toBe(30);
    expect(hasActiveCurriculumPlan(summary)).toBe(true);
    expect(resolveCurriculumPlanState(summary)).toBe('documentation_gap');
  });

  it('treats zero-state without distribution as no active plan (not completed)', () => {
    const summary = normalizeTeachingProgressSummary({
      context: { class_id: 1, teaching_offering_id: 2, annual_distribution_id: null },
      total_items: 0,
      progress_percentage: 0,
      suggestion_reason: 'plan_completed',
      suggested_next_item: null,
      remaining_items: 0,
    });
    expect(hasActiveCurriculumPlan(summary)).toBe(false);
    expect(resolveCurriculumPlanState(summary)).toBe('no_active_plan');
  });

  it('tolerates missing optional fields', () => {
    const summary = normalizeTeachingProgressSummary({});
    expect(summary.suggested_next_item).toBeNull();
    expect(summary.partial_items).toBeNull();
    expect(summary.lines).toEqual([]);
  });

  it('keeps unknown suggestion_reason as opaque value for mapping fallback', () => {
    const summary = normalizeTeachingProgressSummary({
      context: { annual_distribution_id: 1 },
      total_items: 2,
      suggestion_reason: 'future_reason_x',
    });
    expect(summary.suggestion_reason).toBe('future_reason_x');
    expect(isKnownSuggestionReason(summary.suggestion_reason)).toBe(false);
    expect(suggestionReasonMessageKey(summary.suggestion_reason)).toBe(
      'teacher.teachingProgress.suggestionReasons.fallback',
    );
  });

  it('formats percentage for display only (clamp, no recompute)', () => {
    expect(formatProgressPercentage(-5)).toBe(0);
    expect(formatProgressPercentage(150)).toBe(100);
    expect(formatProgressPercentage(33.333)).toBe(33.33);
    expect(
      displayProgressPercentage({
        progress_percentage: 12,
        coverage_percent: 90,
      }),
    ).toBe(12);
  });
});

describe('suggestion reason mapping', () => {
  it.each([
    ['resume_partial_line', 'teacher.teachingProgress.suggestionReasons.resume_partial_line'],
    ['postponed_due', 'teacher.teachingProgress.suggestionReasons.postponed_due'],
    [
      'first_remaining_by_sequence',
      'teacher.teachingProgress.suggestionReasons.first_remaining_by_sequence',
    ],
    ['plan_completed', 'teacher.teachingProgress.suggestionReasons.plan_completed'],
    ['unknown_xyz', 'teacher.teachingProgress.suggestionReasons.fallback'],
  ] as const)('maps %s', (reason, key) => {
    expect(suggestionReasonMessageKey(reason)).toBe(key);
  });
});

describe('next-item / remaining normalization', () => {
  it('normalizes remaining candidate and teacher payload', () => {
    const item = normalizeTeachingRemainingItem({
      distribution_line_id: 7,
      title: 'دعم',
      sequence_order: 3,
      eligibility: true,
      postponed: true,
      remaining_units: 1,
    });
    expect(item?.distribution_line_id).toBe(7);
    expect(item?.postponed).toBe(true);

    const payload = normalizeTeachingTeacherNextItemPayload({
      suggestion: item,
      suggestion_reason: 'postponed_due',
      suggestion_status: 'suggested',
      candidates: [item],
      postponed_items: [item],
      allowed_actions: { select_alternative: true, postpone_item: true },
      warnings: ['next_item_suggestion_is_postponed'],
      source: 'distribution_progress',
    });
    expect(payload.suggestion_reason).toBe('postponed_due');
    expect(payload.candidates).toHaveLength(1);
    expect(payload.allowed_actions?.select_alternative).toBe(true);
  });
});

describe('active plan zero vs completed', () => {
  it('distinguishes 0% active plan from completed plan', () => {
    const zero = normalizeTeachingProgressSummary({
      context: { annual_distribution_id: 5 },
      total_items: 3,
      remaining_items: 3,
      not_started_items: 3,
      progress_percentage: 0,
      suggestion_reason: 'first_remaining_by_sequence',
    });
    expect(resolveCurriculumPlanState(zero)).toBe('active_plan_zero');

    const done = normalizeTeachingProgressSummary({
      context: { annual_distribution_id: 5 },
      total_items: 3,
      remaining_items: 0,
      completed_items: 3,
      progress_percentage: 100,
      suggestion_reason: 'plan_completed',
    });
    expect(resolveCurriculumPlanState(done)).toBe('plan_completed');
  });
});
