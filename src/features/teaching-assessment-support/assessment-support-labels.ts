/**
 * Central i18n key mapping for Assessment Support enums — never show raw codes.
 */

export function masteryStateMessageKey(state: string | null | undefined): string {
  switch (state) {
    case 'draft':
      return 'teachingAssessmentSupport.states.draft';
    case 'confirmed':
      return 'teachingAssessmentSupport.states.confirmed';
    case 'superseded':
      return 'teachingAssessmentSupport.states.superseded';
    case 'voided':
      return 'teachingAssessmentSupport.states.voided';
    case 'resolved':
      return 'teachingAssessmentSupport.states.resolved';
    case 'planned':
      return 'teachingAssessmentSupport.states.planned';
    case 'active':
      return 'teachingAssessmentSupport.states.active';
    case 'completed':
      return 'teachingAssessmentSupport.states.completed';
    case 'cancelled':
      return 'teachingAssessmentSupport.states.cancelled';
    default:
      return 'teachingAssessmentSupport.states.unknown';
  }
}

export function participationMessageKey(state: string | null | undefined): string {
  switch (state) {
    case 'taken':
      return 'teachingAssessmentSupport.participation.taken';
    case 'absent':
      return 'teachingAssessmentSupport.participation.absent';
    case 'absent_justified':
      return 'teachingAssessmentSupport.participation.absentJustified';
    case 'not_assessed':
      return 'teachingAssessmentSupport.participation.notAssessed';
    case 'exempted':
      return 'teachingAssessmentSupport.participation.exempted';
    default:
      return 'teachingAssessmentSupport.participation.unknown';
  }
}

export function supportDecisionTypeMessageKey(type: string | null | undefined): string {
  switch (type) {
    case 'individual_support':
      return 'teachingAssessmentSupport.decisionTypes.individual';
    case 'group_support':
      return 'teachingAssessmentSupport.decisionTypes.group';
    case 'monitor':
      return 'teachingAssessmentSupport.decisionTypes.monitor';
    case 'focused_remediation':
      return 'teachingAssessmentSupport.decisionTypes.focusedRemediation';
    case 'enrichment':
      return 'teachingAssessmentSupport.decisionTypes.enrichment';
    case 'no_action':
      return 'teachingAssessmentSupport.decisionTypes.noAction';
    default:
      return 'teachingAssessmentSupport.decisionTypes.unknown';
  }
}

export function supportPlanTypeMessageKey(type: string | null | undefined): string {
  switch (type) {
    case 'support':
      return 'teachingAssessmentSupport.planTypes.support';
    case 'consolidation':
      return 'teachingAssessmentSupport.planTypes.consolidation';
    case 'focused_remediation':
      return 'teachingAssessmentSupport.planTypes.focusedRemediation';
    case 'enrichment':
      return 'teachingAssessmentSupport.planTypes.enrichment';
    case 'synthesis':
      return 'teachingAssessmentSupport.planTypes.synthesis';
    default:
      return 'teachingAssessmentSupport.planTypes.unknown';
  }
}

export function reassessmentOutcomeMessageKey(outcome: string | null | undefined): string {
  switch (outcome) {
    case 'mastered':
      return 'teachingAssessmentSupport.outcomes.mastered';
    case 'improved_needs_follow_up':
      return 'teachingAssessmentSupport.outcomes.improvedNeedsFollowUp';
    case 'needs_focused_remediation':
      return 'teachingAssessmentSupport.outcomes.needsFocusedRemediation';
    case 'not_assessed':
      return 'teachingAssessmentSupport.outcomes.notAssessed';
    default:
      return 'teachingAssessmentSupport.outcomes.unknown';
  }
}

/** Descriptive comparison only when both before/after mastery levels exist. */
export function reassessmentTrendMessageKey(
  beforeLevelId: number | null | undefined,
  afterLevelId: number | null | undefined,
): string | null {
  if (beforeLevelId == null || afterLevelId == null) return null;
  if (afterLevelId > beforeLevelId) return 'teachingAssessmentSupport.trends.improved';
  if (afterLevelId === beforeLevelId) return 'teachingAssessmentSupport.trends.stable';
  return 'teachingAssessmentSupport.trends.needsFollowUp';
}
