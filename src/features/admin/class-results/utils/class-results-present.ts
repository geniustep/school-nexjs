import type {
  ClassMultiSubjectCellResult,
  ClassMultiSubjectColumn,
  ClassMultiSubjectCoverage,
  ClassMultiSubjectMatrixRow,
  ClassMultiSubjectResults,
  ClassMultiSubjectResultStatus,
  ClassMultiSubjectRosterRow,
  ClassMultiSubjectWarning,
} from '@/types/class-multi-subject-results';

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

export const CLASS_RESULT_STATUSES = [
  'available',
  'complete',
  'partial',
  'not_computable',
  'not_available',
] as const;

export function classResultStatusLabelKey(status: ClassMultiSubjectResultStatus): string {
  const normalized = String(status ?? '').trim();
  if ((CLASS_RESULT_STATUSES as readonly string[]).includes(normalized)) {
    return `admin.classResults.status.${normalized}`;
  }
  return 'admin.classResults.status.unknown';
}

export function classResultReasonLabelKey(reason: string | null | undefined): string | null {
  const normalized = String(reason ?? '').trim();
  if (!normalized) return null;
  if (normalized === 'student_not_in_gradebook_roster') {
    return 'admin.classResults.reasons.student_not_in_gradebook_roster';
  }
  if (normalized === 'participation_state_blocks_aggregation') {
    return 'admin.classResults.reasons.participation_state_blocks_aggregation';
  }
  return null;
}

export function classWarningTitleKey(code: string): string {
  const known = [
    'duplicate_subject_gradebooks',
    'configured_subject_without_gradebook',
    'student_not_in_gradebook_roster',
  ];
  if (known.includes(code)) return `admin.classResults.warnings.codes.${code}`;
  return 'admin.classResults.warnings.codes.unknown';
}

export function isFinalSubjectStatus(status: ClassMultiSubjectResultStatus): boolean {
  return String(status) === 'complete';
}

export function isMissingSubjectStatus(status: ClassMultiSubjectResultStatus): boolean {
  return String(status) === 'not_available';
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeSubjectColumn(raw: ClassMultiSubjectColumn): ClassMultiSubjectColumn {
  return {
    gradebook_id: asNumber(raw.gradebook_id),
    subject_id: asNumber(raw.subject_id),
    subject_code: raw.subject_code ?? null,
    subject_name: String(raw.subject_name ?? ''),
    gradebook_state: String(raw.gradebook_state ?? ''),
    scheme_id: asNullableNumber(raw.scheme_id),
    structure_mode: raw.structure_mode ?? null,
  };
}

function normalizeRosterRow(raw: ClassMultiSubjectRosterRow): ClassMultiSubjectRosterRow {
  return {
    student_id: asNumber(raw.student_id),
    enrollment_id: asNullableNumber(raw.enrollment_id),
    roster_sequence: asNumber(raw.roster_sequence),
    student_name: String(raw.student_name ?? ''),
    student_code: raw.student_code ?? null,
  };
}

function normalizeCell(raw: ClassMultiSubjectCellResult): ClassMultiSubjectCellResult {
  return {
    gradebook_id: asNumber(raw.gradebook_id),
    student_line_id: asNullableNumber(raw.student_line_id),
    status: raw.status ?? 'available',
    score: asNullableNumber(raw.score),
    max_score: asNullableNumber(raw.max_score),
    normalized_score: asNullableNumber(raw.normalized_score),
    completed_cells: asNullableNumber(raw.completed_cells),
    expected_cells: asNullableNumber(raw.expected_cells),
    missing_cells: asNullableNumber(raw.missing_cells),
    blocking_cells: asNullableNumber(raw.blocking_cells),
    available: raw.available ?? null,
    reason: raw.reason ?? null,
    gradebook_state: raw.gradebook_state ?? null,
  };
}

function normalizeMatrixRow(raw: ClassMultiSubjectMatrixRow): ClassMultiSubjectMatrixRow {
  return {
    student_id: asNumber(raw.student_id),
    enrollment_id: asNullableNumber(raw.enrollment_id),
    roster_sequence: asNullableNumber(raw.roster_sequence),
    subject_results: Array.isArray(raw.subject_results)
      ? raw.subject_results.map(normalizeCell)
      : [],
  };
}

function normalizeCoverage(raw: ClassMultiSubjectCoverage | null | undefined): ClassMultiSubjectCoverage {
  const byState =
    raw?.gradebooks_by_state && typeof raw.gradebooks_by_state === 'object'
      ? Object.fromEntries(
          Object.entries(raw.gradebooks_by_state).map(([k, v]) => [k, asNumber(v)]),
        )
      : {};
  return {
    gradebooks_count: asNumber(raw?.gradebooks_count),
    subjects_count: asNumber(raw?.subjects_count),
    roster_count: asNumber(raw?.roster_count),
    students_with_all_subjects: asNumber(raw?.students_with_all_subjects),
    students_with_missing_subjects: asNumber(raw?.students_with_missing_subjects),
    gradebooks_by_state: byState,
    warnings_count: asNumber(raw?.warnings_count),
  };
}

function normalizeWarning(raw: ClassMultiSubjectWarning): ClassMultiSubjectWarning {
  return {
    ...raw,
    code: String(raw.code ?? 'unknown'),
    message: String(raw.message ?? ''),
    subject_id: asNullableNumber(raw.subject_id),
    subject_code: (raw.subject_code as string | null | undefined) ?? null,
    gradebook_id: asNullableNumber(raw.gradebook_id),
    student_id: asNullableNumber(raw.student_id),
  };
}

/** Preserve backend roster order — never re-sort by name or student code. */
export function normalizeClassMultiSubjectResultsPayload(
  raw: ClassMultiSubjectResults,
): ClassMultiSubjectResults {
  return {
    context: {
      school_id: asNumber(raw.context?.school_id),
      academic_year_id: asNumber(raw.context?.academic_year_id),
      term_id: asNumber(raw.context?.term_id),
      class_id: asNumber(raw.context?.class_id),
      class_name: String(raw.context?.class_name ?? ''),
      level_id: asNullableNumber(raw.context?.level_id),
      level_code: raw.context?.level_code ?? null,
    },
    subjects: Array.isArray(raw.subjects) ? raw.subjects.map(normalizeSubjectColumn) : [],
    roster: Array.isArray(raw.roster) ? raw.roster.map(normalizeRosterRow) : [],
    matrix: Array.isArray(raw.matrix) ? raw.matrix.map(normalizeMatrixRow) : [],
    coverage: normalizeCoverage(raw.coverage),
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map(normalizeWarning) : [],
  };
}

export function findSubjectResultForColumn(
  row: ClassMultiSubjectMatrixRow | undefined,
  column: ClassMultiSubjectColumn,
): ClassMultiSubjectCellResult | null {
  if (!row?.subject_results?.length) return null;
  const byGradebook = row.subject_results.find((cell) => cell.gradebook_id === column.gradebook_id);
  if (byGradebook) return byGradebook;
  const matches = row.subject_results.filter((cell) => {
    // Fallback only when gradebook_id is absent on cell — avoid merging duplicates.
    return (cell as { subject_id?: number }).subject_id === column.subject_id;
  });
  return matches.length === 1 ? matches[0]! : null;
}

export function matrixRowByStudentId(
  matrix: ClassMultiSubjectMatrixRow[] | null | undefined,
  studentId: number,
): ClassMultiSubjectMatrixRow | undefined {
  return matrix?.find((row) => row.student_id === studentId);
}

export function subjectColumnLabel(column: ClassMultiSubjectColumn, duplicate: boolean): string {
  const base = column.subject_name?.trim() || column.subject_code || `#${column.subject_id}`;
  if (!duplicate) return base;
  const state = column.gradebook_state ? ` · ${column.gradebook_state}` : '';
  return `${base}${state} (#${column.gradebook_id})`;
}

export function hasDuplicateSubjectColumns(subjects: ClassMultiSubjectColumn[]): boolean {
  const counts = new Map<number, number>();
  for (const subject of subjects) {
    counts.set(subject.subject_id, (counts.get(subject.subject_id) ?? 0) + 1);
  }
  return [...counts.values()].some((n) => n > 1);
}

export function isDuplicateSubjectColumn(
  column: ClassMultiSubjectColumn,
  subjects: ClassMultiSubjectColumn[],
): boolean {
  return subjects.filter((s) => s.subject_id === column.subject_id).length > 1;
}
