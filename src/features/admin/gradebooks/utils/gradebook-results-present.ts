import type {
  AssessmentSlot,
  GradebookResults,
  GradebookResultStatus,
  GradebookRosterRow,
  GradebookStudentResult,
  GradebookStructure,
  SubjectComponent,
} from '@/types/gradebook';

export type ResultNumericDisplay =
  | { kind: 'value'; text: string; value: number }
  | { kind: 'missing' };

/** Preserve real zero; never coerce null/undefined to "0". */
export function formatResultNumeric(value: number | null | undefined): ResultNumericDisplay {
  if (value === null || value === undefined) return { kind: 'missing' };
  if (typeof value !== 'number' || !Number.isFinite(value)) return { kind: 'missing' };
  return { kind: 'value', text: String(value), value };
}

export function formatResultScorePair(
  score: number | null | undefined,
  maxScore: number | null | undefined,
): { score: ResultNumericDisplay; max: ResultNumericDisplay; text: string } {
  const scoreDisp = formatResultNumeric(score);
  const maxDisp = formatResultNumeric(maxScore);
  if (scoreDisp.kind === 'missing') {
    return { score: scoreDisp, max: maxDisp, text: '—' };
  }
  if (maxDisp.kind === 'missing') {
    return { score: scoreDisp, max: maxDisp, text: scoreDisp.text };
  }
  return { score: scoreDisp, max: maxDisp, text: `${scoreDisp.text} / ${maxDisp.text}` };
}

/** Known statuses from the live Results contract (+ partial for future payloads). */
export const GRADEBOOK_RESULT_STATUSES = [
  'available',
  'complete',
  'partial',
  'not_computable',
] as const;

export function gradebookResultStatusLabelKey(status: GradebookResultStatus): string {
  const normalized = String(status ?? '').trim();
  if ((GRADEBOOK_RESULT_STATUSES as readonly string[]).includes(normalized)) {
    return `admin.gradebooks.results.status.${normalized}`;
  }
  return 'admin.gradebooks.results.status.unknown';
}

/** Partial / available / not_computable must not be presented as a final published result. */
export function isFinalAggregateStatus(status: GradebookResultStatus): boolean {
  return String(status) === 'complete';
}

export function normalizeGradebookResultsPayload(raw: GradebookResults): GradebookResults {
  return {
    gradebook_id: Number(raw.gradebook_id),
    state: raw.state,
    mode: raw.mode,
    scheme_id: raw.scheme_id ?? null,
    scheme_version: raw.scheme_version ?? null,
    students: Array.isArray(raw.students) ? raw.students.map(normalizeStudentResult) : [],
  };
}

function normalizeStudentResult(row: GradebookStudentResult): GradebookStudentResult {
  return {
    student_line_id: Number(row.student_line_id),
    student_id: Number(row.student_id),
    cells: Array.isArray(row.cells) ? row.cells : [],
    slots: Array.isArray(row.slots) ? row.slots : [],
    aggregate: {
      status: row.aggregate?.status ?? 'available',
      score: row.aggregate?.score ?? null,
      max_score: row.aggregate?.max_score ?? null,
      normalized_score: row.aggregate?.normalized_score ?? null,
      completed_cells: Number(row.aggregate?.completed_cells ?? 0),
      expected_cells: Number(row.aggregate?.expected_cells ?? 0),
      included_cells: Number(row.aggregate?.included_cells ?? 0),
      missing_cells: Number(row.aggregate?.missing_cells ?? 0),
      blocking_cells: Number(row.aggregate?.blocking_cells ?? 0),
      reason: row.aggregate?.reason ?? null,
    },
  };
}

export type GradebookResultsStatusCounts = {
  studentsTotal: number;
  available: number;
  complete: number;
  partial: number;
  notComputable: number;
  other: number;
};

/** Safe direct counts from returned statuses — no invented averages. */
export function countGradebookResultStatuses(
  students: GradebookStudentResult[] | null | undefined,
): GradebookResultsStatusCounts {
  const counts: GradebookResultsStatusCounts = {
    studentsTotal: 0,
    available: 0,
    complete: 0,
    partial: 0,
    notComputable: 0,
    other: 0,
  };
  if (!Array.isArray(students)) return counts;
  counts.studentsTotal = students.length;
  for (const row of students) {
    const status = String(row.aggregate?.status ?? '');
    if (status === 'available') counts.available += 1;
    else if (status === 'complete') counts.complete += 1;
    else if (status === 'partial') counts.partial += 1;
    else if (status === 'not_computable') counts.notComputable += 1;
    else counts.other += 1;
  }
  return counts;
}

export function resolveStudentDisplayName(
  row: GradebookStudentResult,
  roster: GradebookRosterRow[] | null | undefined,
): string {
  const match = roster?.find(
    (r) => r.gradebook_student_id === row.student_line_id || r.student_id === row.student_id,
  );
  return match?.display_name?.trim() || `#${row.student_id}`;
}

export function slotLabelFromStructure(
  slotId: number,
  structure: GradebookStructure | null | undefined,
): string {
  const slot = structure?.slots?.find((s: AssessmentSlot) => s.slot_id === slotId);
  return slot?.label?.trim() || `Slot ${slotId}`;
}

export function componentLabelFromStructure(
  componentId: number | null | undefined,
  structure: GradebookStructure | null | undefined,
): string | null {
  if (componentId == null) return null;
  const component = structure?.components?.find(
    (c: SubjectComponent) => c.component_id === componentId,
  );
  return component?.label?.trim() || `Component ${componentId}`;
}

export function orderedSlotIdsFromResults(
  students: GradebookStudentResult[],
  structure: GradebookStructure | null | undefined,
): number[] {
  if (structure?.slots?.length) {
    return [...structure.slots]
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0) || a.slot_id - b.slot_id)
      .map((s) => s.slot_id);
  }
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const student of students) {
    for (const slot of student.slots ?? []) {
      if (!seen.has(slot.slot_id)) {
        seen.add(slot.slot_id);
        ids.push(slot.slot_id);
      }
    }
  }
  return ids;
}
