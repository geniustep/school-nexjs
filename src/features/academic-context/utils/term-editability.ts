/**
 * UX gate for draft term edit affordance.
 * Odoo remains the final authority via PATCH — showing the button never implies success.
 *
 * TEMPORARY FALLBACK: when list responses omit `allowed_actions.edit`, allow the
 * affordance only for `state === 'draft'` if the user has manage capability.
 * Remove once list reliably returns `allowed_actions.edit`.
 */

import type { AcademicTermOption } from '@/types/academic-context';

export function canShowEditAcademicTerm(
  term: AcademicTermOption,
  canManage: boolean,
): boolean {
  if (!canManage) return false;

  const editAction = term.allowed_actions?.edit;
  if (typeof editAction === 'boolean') {
    return editAction === true;
  }

  // Temporary compatibility fallback — draft only; never overrides explicit false.
  return term.state === 'draft';
}
