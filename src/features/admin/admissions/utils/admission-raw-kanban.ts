const RAW_COLUMN_STATES = [
  'new',
  'follow_up',
  'in_assessment',
  'decision_pending',
  'waitlisted',
] as const;

/** Drag targets: any official status column except registered. */
export function isRawKanbanDropTarget(state: string): boolean {
  if (!state || state === 'registered') return false;
  return true;
}

export function rawKanbanColumnClass(state: string): string {
  const normalized =
    state === 'contacted' ||
    state === 'visit_pending' ||
    state === 'initial_follow_up'
      ? 'follow_up'
      : state === 'qualified' ||
          state === 'assessment_ready' ||
          state === 'assessment_in_progress'
        ? 'in_assessment'
        : state === 'under_review' || state === 'decision_ready'
          ? 'decision_pending'
          : state;
  return RAW_COLUMN_STATES.includes(normalized as (typeof RAW_COLUMN_STATES)[number])
    ? `admissions-kanban__column--state-${normalized}`
    : `admissions-kanban__column--state-${normalized || 'unknown'}`;
}

export { RAW_COLUMN_STATES };
