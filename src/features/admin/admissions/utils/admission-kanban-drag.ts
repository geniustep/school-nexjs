import type { AdmissionState } from '@/types/admission';
import {
  CLOSED_UI_STAGE,
  REGISTERED_UI_STAGE,
  resolveAdmissionUiStage,
  type AdmissionUiStage,
} from './admission-ui-stage';
import { isAdmissionConvertedToStudent } from './admission-registration';

export type AdmissionKanbanDragRecord = {
  state: AdmissionState | string;
  student_id?: number | false | null;
  registration_flow_state?: string | null;
};

export type DraggableAdmissionUiStage =
  | 'new'
  | 'in_follow_up'
  | 'in_evaluation';

/** Canonical raw state applied when dropping onto a UI stage column. */
export const UI_STAGE_DRAG_TARGET_STATE: Record<DraggableAdmissionUiStage, AdmissionState> = {
  new: 'new',
  in_follow_up: 'contacted',
  in_evaluation: 'under_review',
};

export type KanbanDragDecisionReason =
  | 'same_stage'
  | 'same_state'
  | 'blocked_target'
  | 'not_draggable';

export interface KanbanDragDecision {
  apply: boolean;
  targetState: AdmissionState | null;
  reason?: KanbanDragDecisionReason;
}

export function isUiStageDropTarget(stage: AdmissionUiStage): boolean {
  return (
    stage !== REGISTERED_UI_STAGE &&
    stage !== CLOSED_UI_STAGE &&
    stage !== 'accepted' &&
    stage !== 'ready_for_registration'
  );
}

export function isAdmissionKanbanDraggable(record: AdmissionKanbanDragRecord): boolean {
  return !isAdmissionConvertedToStudent(record);
}

export function resolveKanbanDragTargetState(stage: AdmissionUiStage): AdmissionState | null {
  if (!isUiStageDropTarget(stage)) return null;
  return UI_STAGE_DRAG_TARGET_STATE[stage as keyof typeof UI_STAGE_DRAG_TARGET_STATE] ?? null;
}

export function evaluateKanbanDragStateChange(
  record: AdmissionKanbanDragRecord,
  targetStage: AdmissionUiStage,
): KanbanDragDecision {
  if (!isAdmissionKanbanDraggable(record)) {
    return { apply: false, targetState: null, reason: 'not_draggable' };
  }

  const currentStage = resolveAdmissionUiStage(record);
  if (currentStage === targetStage) {
    return { apply: false, targetState: null, reason: 'same_stage' };
  }

  const targetState = resolveKanbanDragTargetState(targetStage);
  if (!targetState) {
    return { apply: false, targetState: null, reason: 'blocked_target' };
  }

  if (record.state === targetState) {
    return { apply: false, targetState: null, reason: 'same_state' };
  }

  return { apply: true, targetState };
}

/** Applies or clears an optimistic raw-state override for Kanban drag feedback. */
export function patchOptimisticAdmissionState(
  current: ReadonlyMap<number, string>,
  admissionId: number,
  nextState: string | null,
): Map<number, string> {
  const next = new Map(current);
  if (nextState == null) next.delete(admissionId);
  else next.set(admissionId, nextState);
  return next;
}
