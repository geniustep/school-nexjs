/**
 * UX gate for academic term edit affordance.
 * Odoo remains the final authority via PATCH — showing the button never implies success.
 *
 * Confirmed (active) terms may expose date edits via `edit` / `edit_dates`.
 * Fallback when allowed_actions is omitted: draft (full) or active (dates).
 */

import type { AcademicTermOption } from '@/types/academic-context';

export function canShowEditAcademicTerm(
  term: AcademicTermOption,
  canManage: boolean,
): boolean {
  if (!canManage) return false;

  const actions = term.allowed_actions;
  if (actions) {
    if (actions.edit === true || actions.edit_dates === true) return true;
    if (actions.edit === false && actions.edit_dates !== true) return false;
  }

  // Compatibility fallback when list omits allowed_actions.
  return term.state === 'draft' || term.state === 'active';
}

/** Identity fields (name/code) — draft only unless Odoo says otherwise. */
export function canEditAcademicTermIdentity(term: AcademicTermOption): boolean {
  const identity = term.allowed_actions?.edit_identity;
  if (typeof identity === 'boolean') return identity;
  return term.state === 'draft';
}

/** Date fields — draft and confirmed (active). */
export function canEditAcademicTermDates(term: AcademicTermOption): boolean {
  const dates = term.allowed_actions?.edit_dates;
  if (typeof dates === 'boolean') return dates;
  if (term.allowed_actions?.edit === true) return true;
  return term.state === 'draft' || term.state === 'active';
}
