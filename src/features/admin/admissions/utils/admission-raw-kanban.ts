import { isFollowUpProcessingStage } from './admission-assessment-workflow-contract';

const RAW_COLUMN_STATES = [
  'new',
  'initial_follow_up',
  'assessment_ready',
  'assessment_in_progress',
  'decision_ready',
] as const;

/** Drag targets: follow_up processing stages only. */
export function isRawKanbanDropTarget(state: string): boolean {
  return isFollowUpProcessingStage(state);
}

export function rawKanbanColumnClass(state: string): string {
  const normalized =
    state === 'contacted' || state === 'visit_pending'
      ? 'initial_follow_up'
      : state === 'qualified'
        ? 'assessment_ready'
        : state === 'under_review'
          ? 'decision_ready'
          : state;
  return RAW_COLUMN_STATES.includes(normalized as (typeof RAW_COLUMN_STATES)[number])
    ? `admissions-kanban__column--state-${normalized}`
    : '';
}

export { RAW_COLUMN_STATES };
