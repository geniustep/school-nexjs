import { describe, expect, it } from 'vitest';
import {
  LEGACY_STATE_TO_PROCESSING_STAGE,
  mapLegacyListStateParam,
  normalizeAdmissionAssessmentSummary,
  parseAdmissionProcessingStage,
  resolveAssessmentProgress,
  assessmentTypeLabelKey,
  assessmentRecommendationLabelKey,
} from './admission-assessment-workflow-contract';
import { parseWorkspaceListStateFromSearchParams } from './admission-workspace';
import { getAdmissionManualStageOptions } from './admission-stage-options';

describe('processing stages + legacy URL', () => {
  it('25-28. legacy mapping', () => {
    expect(LEGACY_STATE_TO_PROCESSING_STAGE.contacted).toBe('initial_follow_up');
    expect(LEGACY_STATE_TO_PROCESSING_STAGE.qualified).toBe('assessment_ready');
    expect(LEGACY_STATE_TO_PROCESSING_STAGE.visit_pending).toBe('initial_follow_up');
    expect(mapLegacyListStateParam('under_review')).toEqual({ workspace: 'awaiting_decision', clearLegacyState: true });
    const parsed = parseWorkspaceListStateFromSearchParams(new URLSearchParams('state=contacted'));
    expect(parsed.workspace).toBe('follow_up');
    expect(parsed.statusFilter).toBe('follow_up');
    expect(parsed.followStage).toBe('');
    const under = parseWorkspaceListStateFromSearchParams(new URLSearchParams('state=under_review'));
    expect(under.workspace).toBe('follow_up');
  });

  it('29-30. canonical options exclude legacy labels', () => {
    const opts = getAdmissionManualStageOptions();
    expect(opts).not.toContain('qualified');
    expect(opts).not.toContain('visit_pending');
    expect(opts).toContain('assessment_ready');
  });
});

describe('assessments', () => {
  it('31-40. progress + recommendation ≠ decision + type labels', () => {
    expect(resolveAssessmentProgress({ assessment_progress: 'not_required' })).toBe('not_required');
    expect(resolveAssessmentProgress({ assessment_progress: 'not_started' })).toBe('not_started');
    const summary = normalizeAdmissionAssessmentSummary({ progress: 'in_progress', completed_count: 1, required_count: 3 });
    expect(summary?.completed_count).toBe(1);
    expect(summary?.required_count).toBe(3);
    expect(resolveAssessmentProgress({ assessment_progress: 'additional_required' })).toBe('additional_required');
    expect(assessmentRecommendationLabelKey('not_suitable')).toContain('assessmentRecommendations');
    expect(assessmentTypeLabelKey('subject_teacher_assessment')).toContain('subject_teacher_assessment');
    expect(assessmentTypeLabelKey('administrative_interview')).toContain('administrative_interview');
    expect(parseAdmissionProcessingStage('assessment_in_progress')).toBe('assessment_in_progress');
  });
});
