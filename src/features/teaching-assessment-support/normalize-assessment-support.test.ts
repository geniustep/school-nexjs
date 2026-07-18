import { describe, expect, it } from 'vitest';
import {
  normalizeAdminAssessmentSupportSummary,
  normalizeMasteryBatchResult,
  normalizeMasteryMatrix,
  supportPlanSessionHref,
} from './normalize-assessment-support';
import {
  reassessmentOutcomeMessageKey,
  reassessmentTrendMessageKey,
  supportDecisionTypeMessageKey,
} from './assessment-support-labels';
import { MASTERY_BATCH_LIMIT } from '@/types/teaching-assessment-support';
import {
  buildTeacherAssessmentSupportHref,
  parseTeacherAssessmentSupportQuery,
  safeInternalReturnTo,
} from './assessment-support-url';

describe('assessment support normalization', () => {
  it('parses matrix with null cells and optional fields', () => {
    const matrix = normalizeMasteryMatrix({
      school_id: 1,
      academic_year_id: 2,
      class_id: 3,
      subject_id: 4,
      students: [{ id: 10, name: 'A' }],
      objectives: [{ id: 20, code: 'LO-1', name: 'Read' }],
      cells: [
        {
          student_id: 10,
          learning_objective_id: 20,
          observation: null,
        },
      ],
    });
    expect(matrix.students).toHaveLength(1);
    expect(matrix.cells[0]?.observation).toBeNull();
    expect(matrix.cell_count).toBe(1);
  });

  it('keeps summary free of individual detail fields', () => {
    const summary = normalizeAdminAssessmentSupportSummary({
      objectives_count: 3,
      assessed_students_count: 2,
      observations_count: 5,
      mastery_distribution_counts: { L1: 2 },
      not_assessed_count: 1,
      difficulties_count: 0,
      open_support_decisions_count: 1,
      active_support_groups_count: 0,
      planned_support_count: 1,
      delivered_support_count: 0,
      reassessment_due_count: 0,
      reassessment_outcome_counts: { mastered: 1 },
      student_name: 'SHOULD_STRIP',
      observation_text: 'secret',
      memberships: [{ id: 1 }],
      privacy: {
        includes_student_names: false,
        includes_observation_text: false,
        includes_interpretation_text: false,
        includes_membership_list: false,
      },
    });
    expect(summary.objectives_count).toBe(3);
    expect(summary).not.toHaveProperty('student_name');
    expect(summary).not.toHaveProperty('observation_text');
    expect(summary).not.toHaveProperty('memberships');
    expect(summary.privacy.includes_student_names).toBe(false);
  });

  it('never invents session links without occurrence_id', () => {
    expect(supportPlanSessionHref({ id: 1, occurrence_id: null })).toBeNull();
    expect(supportPlanSessionHref({ id: 1, occurrence_id: 0 })).toBeNull();
    expect(supportPlanSessionHref({ id: 1, occurrence_id: 99 }, '/teacher/teaching/assessment-support')).toContain(
      '/teacher/sessions/99',
    );
  });

  it('normalizes batch result', () => {
    const result = normalizeMasteryBatchResult({
      created_ids: [1, 2],
      updated_ids: [],
      confirmed: true,
      row_count: 2,
    });
    expect(result.row_count).toBe(2);
    expect(result.confirmed).toBe(true);
  });
});

describe('assessment support labels', () => {
  it('maps enums to i18n keys (never raw for UI)', () => {
    expect(supportDecisionTypeMessageKey('individual_support')).toBe(
      'teachingAssessmentSupport.decisionTypes.individual',
    );
    expect(reassessmentOutcomeMessageKey('improved_needs_follow_up')).toBe(
      'teachingAssessmentSupport.outcomes.improvedNeedsFollowUp',
    );
    expect(reassessmentTrendMessageKey(1, 2)).toBe('teachingAssessmentSupport.trends.improved');
    expect(reassessmentTrendMessageKey(2, 2)).toBe('teachingAssessmentSupport.trends.stable');
    expect(reassessmentTrendMessageKey(null, 2)).toBeNull();
  });
});

describe('assessment support URL', () => {
  it('blocks open redirects and requires positive ids', () => {
    expect(safeInternalReturnTo('https://evil.example')).toBeNull();
    expect(safeInternalReturnTo('//evil')).toBeNull();
    expect(safeInternalReturnTo('/teacher/dashboard')).toBe('/teacher/dashboard');
    const href = buildTeacherAssessmentSupportHref({
      classId: 3,
      subjectId: 4,
      academicYearId: 2,
      tab: 'matrix',
      returnTo: 'https://evil.example',
    });
    expect(href).toContain('class_id=3');
    expect(href).toContain('subject_id=4');
    expect(href).not.toContain('return_to=');
  });

  it('parses context and clears invalid tab', () => {
    const parsed = parseTeacherAssessmentSupportQuery(
      new URLSearchParams('class_id=3&subject_id=4&academic_year_id=2&tab=evil&return_to=/teacher/dashboard'),
    );
    expect(parsed.tab).toBe('matrix');
    expect(parsed.returnTo).toBe('/teacher/dashboard');
  });
});

describe('mastery batch limit contract', () => {
  it('exposes atomic UI max of 500', () => {
    expect(MASTERY_BATCH_LIMIT).toBe(500);
  });
});
