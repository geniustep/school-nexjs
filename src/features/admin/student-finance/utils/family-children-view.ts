import type { FamilyFinanceChild } from '@/types/family-finance';

export interface FamilyChildrenView {
  /** Total students linked to the same billing account. */
  total: number;
  /** Students other than the current one (the actual siblings). */
  otherCount: number;
  /** True when at least one other student shares the billing account. */
  hasOtherSiblings: boolean;
  /**
   * True when the table only contains the current student, so we should avoid
   * implying the student is their own sibling and show a clarifying note instead.
   */
  showOnlyCurrentNote: boolean;
}

/**
 * Pure helper for the family-finance children table heading/notes.
 *
 * It does NOT touch any financial figures; it only classifies whether the linked
 * account contains real siblings or just the current student, so the UI can pick
 * a non-confusing heading and note.
 */
export function resolveFamilyChildrenView(
  children: FamilyFinanceChild[],
  currentStudentId: number,
): FamilyChildrenView {
  const total = children.length;
  const otherCount = children.reduce(
    (acc, child) => (child.student_id !== currentStudentId ? acc + 1 : acc),
    0,
  );
  const hasOtherSiblings = otherCount > 0;

  return {
    total,
    otherCount,
    hasOtherSiblings,
    showOnlyCurrentNote: total > 0 && !hasOtherSiblings,
  };
}
