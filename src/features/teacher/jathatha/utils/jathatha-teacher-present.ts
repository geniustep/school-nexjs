'use client';

import type { SessionOccurrenceSummary } from '@/types/jathatha';

export type TeacherJathathaPrimaryCta = {
  href: string;
  labelKey: string;
};

/**
 * The occurrence is the authority for workflow entry points.  In particular,
 * a weekly timetable slot must never be presented as an occurrence.
 */
export function resolveTeacherJathathaPrimaryCta(
  occurrence: SessionOccurrenceSummary,
): TeacherJathathaPrimaryCta | null {
  const actions = occurrence.allowed_actions ?? {};
  const sessionHref = `/teacher/sessions/${occurrence.id}`;

  if (occurrence.jathatha_review_state === 'correction_requested' && actions.create_correction) {
    return occurrence.current_jathatha_id
      ? { href: `/teacher/jathathas/${occurrence.current_jathatha_id}?action=correction`, labelKey: 'teacher.jathatha.createCorrection' }
      : null;
  }
  if (actions.create_jathatha) return { href: `${sessionHref}?tab=jathatha`, labelKey: 'teacher.jathatha.prepare' };
  if (!actions.view_jathatha) return null;

  if (occurrence.jathatha_state === 'draft') return { href: sessionHref, labelKey: 'teacher.jathatha.continue' };
  if (occurrence.jathatha_state === 'ready') return { href: sessionHref, labelKey: 'teacher.jathatha.review' };
  if (occurrence.jathatha_state === 'confirmed') return { href: sessionHref, labelKey: 'teacher.jathatha.view' };
  return { href: sessionHref, labelKey: 'teacher.jathatha.view' };
}

export const weeklySlotPreviewLabelKey = 'teacher.jathatha.weeklySlotPreview';
