export type FamilyNextDueAttribution =
  | 'current_student'
  | 'other_family_student'
  | 'family_unscoped'
  | 'none';

export interface FamilyNextDuePresentation {
  show: boolean;
  isFamilyScope: boolean;
  nextDueDate: string | null;
  nextDueAmount: number | null;
  nextDueStudentId: number | null;
  attribution: FamilyNextDueAttribution;
  /** Name only when already present in the allowed family payload. */
  attributedStudentName: string | null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function resolveFamilyNextDuePresentation(input: {
  currentStudentId: number;
  next_due_scope?: string | null;
  next_due_student_id?: number | null;
  next_due_date?: string | null;
  next_due_amount?: number | null;
  children?: Array<{ student_id: number; student_name?: string | null }> | null;
}): FamilyNextDuePresentation {
  const nextDueDate = readString(input.next_due_date);
  const nextDueAmount = readNumber(input.next_due_amount);
  const nextDueStudentId = readNumber(input.next_due_student_id);
  const scope = readString(input.next_due_scope)?.toLowerCase() ?? null;
  const isFamilyScope = scope === 'family';

  const empty: FamilyNextDuePresentation = {
    show: false,
    isFamilyScope: false,
    nextDueDate: null,
    nextDueAmount: null,
    nextDueStudentId: null,
    attribution: 'none',
    attributedStudentName: null,
  };

  if (!nextDueDate && nextDueAmount == null && nextDueStudentId == null && !isFamilyScope) {
    return empty;
  }

  let attribution: FamilyNextDueAttribution = 'none';
  let attributedStudentName: string | null = null;

  if (nextDueStudentId != null) {
    if (nextDueStudentId === input.currentStudentId) {
      attribution = 'current_student';
    } else {
      attribution = 'other_family_student';
    }
    const child = (input.children ?? []).find((item) => item.student_id === nextDueStudentId);
    attributedStudentName = readString(child?.student_name);
  } else if (isFamilyScope) {
    attribution = 'family_unscoped';
  }

  return {
    show: true,
    isFamilyScope: isFamilyScope || attribution === 'other_family_student',
    nextDueDate,
    nextDueAmount,
    nextDueStudentId,
    attribution,
    attributedStudentName,
  };
}
