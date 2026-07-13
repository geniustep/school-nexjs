'use client';

import type { SessionOccurrenceSummary } from '@/types/jathatha';
import type {
  DeliveryCompletionState,
  DeliveryDeviationType,
} from '@/types/teaching-delivery';

export type TeacherDeliveryPrimaryCta = {
  href: string;
  labelKey: string;
};

/**
 * Prefer delivery CTAs when Backend allows them; otherwise fall through to
 * caller (Jathatha CTA). Never invent actions without allowed_actions.
 */
export function resolveTeacherDeliveryPrimaryCta(
  occurrence: SessionOccurrenceSummary,
): TeacherDeliveryPrimaryCta | null {
  const actions = occurrence.allowed_actions ?? {};
  const sessionHref = `/teacher/sessions/${occurrence.id}`;
  const deliveryHref = occurrence.current_delivery_id
    ? `/teacher/actual-deliveries/${occurrence.current_delivery_id}`
    : `${sessionHref}?tab=delivery`;

  if (
    occurrence.delivery_review_state === 'correction_requested' &&
    actions.view_delivery
  ) {
    return {
      href: `${deliveryHref}?action=correction`,
      labelKey: 'teacher.delivery.createCorrection',
    };
  }

  if (actions.create_delivery && !occurrence.current_delivery_id) {
    return { href: `${sessionHref}?tab=delivery`, labelKey: 'teacher.delivery.register' };
  }

  if (actions.view_delivery && occurrence.delivery_state === 'draft' && occurrence.current_delivery_id) {
    return { href: deliveryHref, labelKey: 'teacher.delivery.continue' };
  }

  if (
    actions.view_delivery &&
    occurrence.current_delivery_id &&
    occurrence.delivery_state &&
    ['confirmed', 'corrected'].includes(occurrence.delivery_state)
  ) {
    return { href: deliveryHref, labelKey: 'teacher.delivery.view' };
  }

  if (actions.view_delivery && occurrence.current_delivery_id) {
    return { href: deliveryHref, labelKey: 'teacher.delivery.view' };
  }

  if (actions.view_journal && occurrence.current_journal_entry_id) {
    return {
      href: `/teacher/class-journal/${occurrence.current_journal_entry_id}`,
      labelKey: 'teacher.delivery.viewJournal',
    };
  }

  if (actions.view_progress) {
    return { href: `${sessionHref}?tab=progress`, labelKey: 'teacher.delivery.viewProgress' };
  }

  return null;
}

/** Merge delivery CTA first, then jathatha CTA from caller. */
export function resolveTeacherSessionPrimaryCta(
  occurrence: SessionOccurrenceSummary,
  jathathaCta: TeacherDeliveryPrimaryCta | null,
): TeacherDeliveryPrimaryCta | null {
  return resolveTeacherDeliveryPrimaryCta(occurrence) ?? jathathaCta;
}

export function syncCompletionPercent(
  state: DeliveryCompletionState,
  percent: number | null | undefined,
): number {
  if (state === 'completed') return 100;
  if (state === 'not_completed') return 0;
  const value = percent ?? 50;
  return Math.min(99, Math.max(1, Math.round(value)));
}

export function isSameDistributionLine(
  plannedId: number | null | undefined,
  deliveredId: number | null | undefined,
): boolean {
  return plannedId != null && deliveredId != null && plannedId === deliveredId;
}

export function requiresDeviationReason(
  plannedId: number | null | undefined,
  deliveredId: number | null | undefined,
  deviationType: DeliveryDeviationType | null | undefined,
): boolean {
  if (!deliveredId) return false;
  if (isSameDistributionLine(plannedId, deliveredId)) return false;
  return deviationType != null && deviationType !== 'none';
}

export function defaultDeviationType(
  plannedId: number | null | undefined,
  deliveredId: number | null | undefined,
): DeliveryDeviationType {
  if (!deliveredId || isSameDistributionLine(plannedId, deliveredId)) return 'none';
  return 'teacher_decision';
}
