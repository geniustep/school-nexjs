import type {
  StudentMultiSubjectColumn,
  StudentMultiSubjectCoverage,
  StudentMultiSubjectEnrollment,
  StudentMultiSubjectResultRow,
  StudentMultiSubjectResults,
  StudentMultiSubjectResultStatus,
  StudentMultiSubjectStudent,
  StudentMultiSubjectWarning,
} from '@/types/student-multi-subject-results';
import {
  formatResultNumeric,
  formatResultScorePair,
} from '@/features/admin/class-results/utils/class-results-present';

export { formatResultNumeric, formatResultScorePair };

export const STUDENT_RESULT_STATUSES = [
  'available',
  'complete',
  'partial',
  'not_computable',
  'not_available',
] as const;

export type StudentSubjectResultView = {
  subject_id: number | null;
  subject_name: string;
  subject_code: string | null;
  gradebook_id: number | null;
  gradebook_state: string | null;
  status: StudentMultiSubjectResultStatus;
  score: number | null;
  max_score: number | null;
  normalized_score: number | null;
  completed_cells: number | null;
  expected_cells: number | null;
  missing_cells: number | null;
  reason: string | null;
};

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function studentResultStatusLabelKey(status: StudentMultiSubjectResultStatus): string {
  const normalized = String(status ?? '').trim();
  if ((STUDENT_RESULT_STATUSES as readonly string[]).includes(normalized)) {
    return `admin.student360.academic.status.${normalized}`;
  }
  return 'admin.student360.academic.status.unknown';
}

export function studentResultReasonLabelKey(reason: string | null | undefined): string | null {
  const normalized = String(reason ?? '').trim();
  if (!normalized) return null;
  const known = [
    'student_not_in_gradebook_roster',
    'student_not_enrolled_for_academic_year',
    'participation_state_blocks_aggregation',
  ];
  if (known.includes(normalized)) {
    return `admin.student360.academic.reasons.${normalized}`;
  }
  return null;
}

export function studentWarningTitleKey(code: string): string {
  const known = [
    'duplicate_subject_gradebooks',
    'configured_subject_without_gradebook',
    'student_not_in_gradebook_roster',
    'student_not_enrolled_for_academic_year',
  ];
  if (known.includes(code)) return `admin.student360.academic.warnings.codes.${code}`;
  return 'admin.student360.academic.warnings.codes.unknown';
}

export function isPartialStudentResultStatus(status: StudentMultiSubjectResultStatus): boolean {
  return String(status) === 'partial';
}

export function isMissingStudentResultStatus(status: StudentMultiSubjectResultStatus): boolean {
  return String(status) === 'not_available';
}

export function isNotComputableStudentResultStatus(status: StudentMultiSubjectResultStatus): boolean {
  return String(status) === 'not_computable';
}

export function isStudentNotEnrolledPayload(data: StudentMultiSubjectResults | null | undefined): boolean {
  if (!data) return false;
  const reason = String(data.reason ?? '').trim();
  if (reason === 'student_not_enrolled_for_academic_year') return true;
  if (String(data.status) === 'not_available' && reason.includes('not_enrolled')) return true;
  return data.warnings.some((w) => String(w.code) === 'student_not_enrolled_for_academic_year');
}

function normalizeSubject(raw: StudentMultiSubjectColumn): StudentMultiSubjectColumn {
  return {
    gradebook_id: asNullableNumber(raw.gradebook_id),
    subject_id: asNumber(raw.subject_id),
    subject_code: raw.subject_code ?? null,
    subject_name: String(raw.subject_name ?? ''),
    gradebook_state: raw.gradebook_state ?? null,
    scheme_id: asNullableNumber(raw.scheme_id),
    structure_mode: raw.structure_mode ?? null,
  };
}

function normalizeResult(raw: StudentMultiSubjectResultRow): StudentMultiSubjectResultRow {
  return {
    gradebook_id: asNullableNumber(raw.gradebook_id),
    subject_id: asNullableNumber(raw.subject_id),
    subject_code: raw.subject_code ?? null,
    subject_name: raw.subject_name ?? null,
    gradebook_state: raw.gradebook_state ?? null,
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
  };
}

function normalizeCoverage(raw: StudentMultiSubjectCoverage | null | undefined): StudentMultiSubjectCoverage {
  return {
    subjects_count: asNumber(raw?.subjects_count),
    available_subjects: asNumber(raw?.available_subjects),
    complete_subjects: asNumber(raw?.complete_subjects),
    partial_subjects: asNumber(raw?.partial_subjects),
    not_computable_subjects: asNumber(raw?.not_computable_subjects),
    not_available_subjects: asNumber(raw?.not_available_subjects),
    missing_subjects: asNumber(raw?.missing_subjects),
  };
}

function normalizeWarning(raw: StudentMultiSubjectWarning): StudentMultiSubjectWarning {
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

function normalizeStudent(raw: StudentMultiSubjectStudent | null | undefined): StudentMultiSubjectStudent {
  return {
    student_id: asNumber(raw?.student_id),
    student_name: raw?.student_name ?? null,
    student_code: raw?.student_code ?? null,
  };
}

function normalizeEnrollment(
  raw: StudentMultiSubjectEnrollment | null | undefined,
): StudentMultiSubjectEnrollment | null {
  if (raw == null) return null;
  return {
    enrollment_id: asNullableNumber(raw.enrollment_id),
    roster_sequence: asNullableNumber(raw.roster_sequence),
    state: raw.state ?? null,
    class_id: asNullableNumber(raw.class_id),
    class_name: raw.class_name ?? null,
    level_id: asNullableNumber(raw.level_id),
    level_code: raw.level_code ?? null,
  };
}

/** Preserve backend values only — never invent averages or rankings. */
export function normalizeStudentMultiSubjectResultsPayload(
  raw: StudentMultiSubjectResults,
): StudentMultiSubjectResults {
  return {
    status: raw.status ?? null,
    reason: raw.reason ?? null,
    context: {
      school_id: asNumber(raw.context?.school_id),
      academic_year_id: asNumber(raw.context?.academic_year_id),
      term_id: asNumber(raw.context?.term_id),
      class_id: asNullableNumber(raw.context?.class_id),
      class_name: raw.context?.class_name ?? null,
      level_id: asNullableNumber(raw.context?.level_id),
      level_code: raw.context?.level_code ?? null,
      academic_year_name: raw.context?.academic_year_name ?? null,
      term_name: raw.context?.term_name ?? null,
    },
    student: normalizeStudent(raw.student),
    enrollment: normalizeEnrollment(raw.enrollment),
    subjects: Array.isArray(raw.subjects) ? raw.subjects.map(normalizeSubject) : [],
    results: Array.isArray(raw.results) ? raw.results.map(normalizeResult) : [],
    coverage: normalizeCoverage(raw.coverage),
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map(normalizeWarning) : [],
  };
}

function findResultForSubject(
  results: StudentMultiSubjectResultRow[],
  subject: StudentMultiSubjectColumn,
): StudentMultiSubjectResultRow | null {
  if (subject.gradebook_id != null) {
    const byGradebook = results.find((row) => row.gradebook_id === subject.gradebook_id);
    if (byGradebook) return byGradebook;
  }
  const bySubject = results.filter((row) => row.subject_id === subject.subject_id);
  return bySubject.length === 1 ? bySubject[0]! : null;
}

/** Join subjects + results for display without recomputing scores. */
export function buildStudentSubjectResultViews(
  data: StudentMultiSubjectResults,
): StudentSubjectResultView[] {
  const used = new Set<StudentMultiSubjectResultRow>();
  const views: StudentSubjectResultView[] = [];

  for (const subject of data.subjects) {
    const result = findResultForSubject(data.results, subject);
    if (result) used.add(result);
    views.push({
      subject_id: subject.subject_id,
      subject_name: subject.subject_name || subject.subject_code || `#${subject.subject_id}`,
      subject_code: subject.subject_code ?? null,
      gradebook_id: subject.gradebook_id ?? result?.gradebook_id ?? null,
      gradebook_state: subject.gradebook_state ?? result?.gradebook_state ?? null,
      status: result?.status ?? 'not_available',
      score: result?.score ?? null,
      max_score: result?.max_score ?? null,
      normalized_score: result?.normalized_score ?? null,
      completed_cells: result?.completed_cells ?? null,
      expected_cells: result?.expected_cells ?? null,
      missing_cells: result?.missing_cells ?? null,
      reason: result?.reason ?? null,
    });
  }

  for (const result of data.results) {
    if (used.has(result)) continue;
    views.push({
      subject_id: result.subject_id ?? null,
      subject_name:
        result.subject_name ||
        result.subject_code ||
        (result.subject_id != null ? `#${result.subject_id}` : '—'),
      subject_code: result.subject_code ?? null,
      gradebook_id: result.gradebook_id ?? null,
      gradebook_state: result.gradebook_state ?? null,
      status: result.status,
      score: result.score,
      max_score: result.max_score,
      normalized_score: result.normalized_score,
      completed_cells: result.completed_cells ?? null,
      expected_cells: result.expected_cells ?? null,
      missing_cells: result.missing_cells ?? null,
      reason: result.reason ?? null,
    });
  }

  return views;
}

export function payloadHasAverageOrRanking(data: unknown): boolean {
  return /overall_average|weighted_average|class_average|ranking/.test(JSON.stringify(data ?? {}));
}
