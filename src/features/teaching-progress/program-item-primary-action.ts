/**
 * Central primary-action resolver for teacher program rows.
 * Rules stay out of JSX. Never invent Session Hub links without occurrence id.
 */

import {
  resolveDeliveryId,
  resolveOccurrenceId,
  type TeacherProgramItemView,
} from '@/features/teaching-progress/merge-program-items';
import { sessionHubHref } from '@/features/teaching-progress/planning-url';
import type {
  TeachingExecutionDecisionRecord,
  TeachingNextItemAllowedActions,
} from '@/types/teaching-delivery';

export type TeacherProgramPrimaryActionKind =
  | 'document_session'
  | 'continue_item'
  | 'continue_prep'
  | 'open_session'
  | 'create_correction'
  | 'open_prep'
  | 'accept_suggestion'
  | 'choose_postponed'
  | 'view_delivery'
  | 'view_details'
  | 'waiting_for_schedule'
  | 'none';

export type TeacherProgramPrimaryAction = {
  kind: TeacherProgramPrimaryActionKind;
  labelKey: string;
  href?: string;
  decisionType?: 'accept_suggestion' | 'choose_postponed';
};

export type TeacherProgramSecondaryAction = {
  key: string;
  labelKey: string;
  href?: string;
  decisionType?: 'accept_suggestion' | 'select_alternative' | 'postpone_item' | 'choose_postponed';
  openDetails?: boolean;
};

function planningReturn(classId: number, offeringId: number): string {
  const q = new URLSearchParams({
    class_id: String(classId),
    offering_id: String(offeringId),
  });
  return `/teacher/teaching/planning?${q.toString()}`;
}

function alreadyAcceptedSuggestion(
  item: TeacherProgramItemView,
  currentDecision?: TeachingExecutionDecisionRecord | null,
): boolean {
  if (!currentDecision) return false;
  if (currentDecision.decision_type !== 'accept_suggestion') return false;
  const selected =
    currentDecision.selected_distribution_line_id ??
    currentDecision.suggested_distribution_line_id;
  return selected === item.distribution_line_id;
}

export function getTeacherProgramItemPrimaryAction(args: {
  item: TeacherProgramItemView;
  allowedActions?: TeachingNextItemAllowedActions | null;
  classId: number;
  offeringId: number;
  currentDecision?: TeachingExecutionDecisionRecord | null;
}): TeacherProgramPrimaryAction {
  const { item, allowedActions, classId, offeringId, currentDecision } = args;
  const occurrenceId = resolveOccurrenceId(item);
  const deliveryId = resolveDeliveryId(item);
  const jathathaId =
    item.teacher_jathatha_id != null && item.teacher_jathatha_id > 0
      ? item.teacher_jathatha_id
      : null;
  const returnTo = planningReturn(classId, offeringId);
  const jathathaState = (item.jathatha_state ?? '').toLowerCase();

  if (item.completed) {
    if (deliveryId) {
      return {
        kind: 'view_delivery',
        labelKey: 'teacher.teachingProgress.actions.viewDelivery',
        href: `/teacher/actual-deliveries/${deliveryId}`,
      };
    }
    return {
      kind: 'view_details',
      labelKey: 'teacher.teachingProgress.actions.viewDetails',
    };
  }

  if (item.needs_documentation && occurrenceId) {
    return {
      kind: 'document_session',
      labelKey: 'teacher.teachingProgress.actions.documentSession',
      href: sessionHubHref(occurrenceId, 'delivery', returnTo),
    };
  }

  if (item.is_partial && occurrenceId) {
    return {
      kind: 'continue_item',
      labelKey: 'teacher.teachingProgress.actions.continueItem',
      href: sessionHubHref(occurrenceId, 'delivery', returnTo),
    };
  }

  if (jathathaState === 'draft' && (jathathaId || occurrenceId)) {
    return {
      kind: 'continue_prep',
      labelKey: 'teacher.teachingProgress.actions.continuePrep',
      href: jathathaId
        ? `/teacher/jathathas/${jathathaId}`
        : sessionHubHref(occurrenceId!, 'jathatha', returnTo),
    };
  }

  if ((jathathaState === 'ready' || jathathaState === 'confirmed') && occurrenceId) {
    return {
      kind: 'open_session',
      labelKey: 'teacher.teachingProgress.actions.openSession',
      href: sessionHubHref(occurrenceId, 'overview', returnTo),
    };
  }

  if (item.create_correction && deliveryId) {
    return {
      kind: 'create_correction',
      labelKey: 'teacher.teachingProgress.actions.createCorrection',
      href: `/teacher/actual-deliveries/${deliveryId}`,
    };
  }
  if (item.create_correction && occurrenceId) {
    return {
      kind: 'create_correction',
      labelKey: 'teacher.teachingProgress.actions.createCorrection',
      href: sessionHubHref(occurrenceId, 'delivery', returnTo),
    };
  }

  if (
    !item.completed &&
    !item.is_partial &&
    !item.postponed &&
    occurrenceId &&
    jathathaState !== 'draft' &&
    jathathaState !== 'ready' &&
    jathathaState !== 'confirmed'
  ) {
    return {
      kind: 'open_prep',
      labelKey: 'teacher.teachingProgress.actions.openPrep',
      href: sessionHubHref(occurrenceId, 'jathatha', returnTo),
    };
  }

  if (
    item.is_suggested &&
    allowedActions?.accept_suggestion &&
    !item.completed &&
    !alreadyAcceptedSuggestion(item, currentDecision)
  ) {
    return {
      kind: 'accept_suggestion',
      labelKey: 'teacher.teachingProgress.actions.acceptSuggestion',
      decisionType: 'accept_suggestion',
    };
  }

  if (item.postponed && allowedActions?.choose_postponed && !item.completed) {
    return {
      kind: 'choose_postponed',
      labelKey: 'teacher.teachingProgress.actions.choosePostponed',
      decisionType: 'choose_postponed',
    };
  }

  if (item.progress_line_id || item.latest_postponement_reason || item.blocked_reason) {
    return {
      kind: 'view_details',
      labelKey: 'teacher.teachingProgress.actions.viewDetails',
    };
  }

  if (!occurrenceId && !deliveryId && !jathathaId) {
    return {
      kind: 'waiting_for_schedule',
      labelKey: 'teacher.teachingProgress.actions.waitingForSchedule',
    };
  }

  return {
    kind: 'view_details',
    labelKey: 'teacher.teachingProgress.actions.viewDetails',
  };
}

export function getTeacherProgramItemSecondaryActions(args: {
  item: TeacherProgramItemView;
  allowedActions?: TeachingNextItemAllowedActions | null;
  classId: number;
  offeringId: number;
  currentDecision?: TeachingExecutionDecisionRecord | null;
  primary: TeacherProgramPrimaryAction;
}): TeacherProgramSecondaryAction[] {
  const { item, allowedActions, classId, offeringId, currentDecision, primary } = args;
  const occurrenceId = resolveOccurrenceId(item);
  const deliveryId = resolveDeliveryId(item);
  const jathathaId =
    item.teacher_jathatha_id != null && item.teacher_jathatha_id > 0
      ? item.teacher_jathatha_id
      : null;
  const returnTo = planningReturn(classId, offeringId);
  const actions: TeacherProgramSecondaryAction[] = [];
  const used = new Set<string>([primary.kind]);

  const push = (action: TeacherProgramSecondaryAction) => {
    if (used.has(action.key)) return;
    used.add(action.key);
    actions.push(action);
  };

  push({
    key: 'view_details',
    labelKey: 'teacher.teachingProgress.actions.viewDetails',
    openDetails: true,
  });

  if (jathathaId && primary.kind !== 'continue_prep') {
    push({
      key: 'open_jathatha',
      labelKey: 'teacher.teachingProgress.actions.continuePrep',
      href: `/teacher/jathathas/${jathathaId}`,
    });
  } else if (occurrenceId && primary.kind !== 'open_prep' && primary.kind !== 'continue_prep') {
    push({
      key: 'open_prep',
      labelKey: 'teacher.teachingProgress.actions.openPrep',
      href: sessionHubHref(occurrenceId, 'jathatha', returnTo),
    });
  }

  if (occurrenceId && primary.kind !== 'document_session' && primary.kind !== 'continue_item') {
    push({
      key: 'document',
      labelKey: 'teacher.teachingProgress.actions.documentSession',
      href: sessionHubHref(occurrenceId, 'delivery', returnTo),
    });
  }

  if (deliveryId && primary.kind !== 'view_delivery' && primary.kind !== 'create_correction') {
    push({
      key: 'view_delivery',
      labelKey: 'teacher.teachingProgress.actions.viewDelivery',
      href: `/teacher/actual-deliveries/${deliveryId}`,
    });
  }

  if (item.create_correction && deliveryId && primary.kind !== 'create_correction') {
    push({
      key: 'create_correction',
      labelKey: 'teacher.teachingProgress.actions.createCorrection',
      href: `/teacher/actual-deliveries/${deliveryId}`,
    });
  }

  if (item.journal_entry_id) {
    push({
      key: 'journal',
      labelKey: 'teacher.teachingProgress.actions.viewJournal',
      href: `/teacher/class-journal/${item.journal_entry_id}`,
    });
  } else if (occurrenceId) {
    push({
      key: 'journal_tab',
      labelKey: 'teacher.teachingProgress.actions.viewJournal',
      href: sessionHubHref(occurrenceId, 'journal', returnTo),
    });
  }

  if (classId > 0) {
    push({
      key: 'homework',
      labelKey: 'teacher.teachingProgress.actions.classHomeworks',
      href: `/teacher/classes/${classId}/homeworks`,
    });
  }

  if (
    item.is_suggested &&
    allowedActions?.accept_suggestion &&
    primary.kind !== 'accept_suggestion' &&
    !alreadyAcceptedSuggestion(item, currentDecision)
  ) {
    push({
      key: 'accept_suggestion',
      labelKey: 'teacher.teachingProgress.actions.acceptSuggestion',
      decisionType: 'accept_suggestion',
    });
  }

  if (allowedActions?.select_alternative && !item.completed) {
    push({
      key: 'select_alternative',
      labelKey: 'teacher.teachingProgress.chooseOther',
      decisionType: 'select_alternative',
    });
  }

  if (allowedActions?.postpone_item && item.is_suggested && !item.completed) {
    push({
      key: 'postpone_item',
      labelKey: 'teacher.teachingProgress.decision.postponeAction',
      decisionType: 'postpone_item',
    });
  }

  if (
    item.postponed &&
    allowedActions?.choose_postponed &&
    primary.kind !== 'choose_postponed' &&
    !item.completed
  ) {
    push({
      key: 'choose_postponed',
      labelKey: 'teacher.teachingProgress.actions.choosePostponed',
      decisionType: 'choose_postponed',
    });
  }

  if (item.progress_line_id) {
    push({
      key: 'progress_line',
      labelKey: 'teacher.teachingProgress.actions.viewProgressLine',
      href: `/teacher/teaching-progress/${item.progress_line_id}`,
    });
  }

  return actions;
}
