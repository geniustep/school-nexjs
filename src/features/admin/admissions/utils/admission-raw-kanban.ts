import { isAdmissionManualStage } from './admission-stage-options';

const RAW_COLUMN_STATES = [
  'new',
  'contacted',
  'qualified',
  'visit_pending',
  'under_review',
] as const;

export function isRawKanbanDropTarget(state: string): boolean {
  return isAdmissionManualStage(state);
}

export function rawKanbanColumnClass(state: string): string {
  return RAW_COLUMN_STATES.includes(state as (typeof RAW_COLUMN_STATES)[number])
    ? `admissions-kanban__column--state-${state}`
    : '';
}

export { RAW_COLUMN_STATES };
