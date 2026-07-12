import type {
  BatchUpdateDiagnosticLinesResponse,
  DiagnosticAllowedActions,
  DiagnosticAssessmentDetail,
  DiagnosticAssessmentLine,
  DiagnosticAssessmentSummary,
  DiagnosticCompletion,
  DiagnosticPrintPayload,
  DiagnosticScoreScaleItem,
} from '@/types/diagnostic-assessment';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === false || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function emptyDistribution(): Record<string, number> {
  const out: Record<string, number> = {};
  for (let score = 1; score <= 10; score += 1) out[String(score)] = 0;
  return out;
}

export function normalizeDiagnosticAllowedActions(
  raw: unknown,
): DiagnosticAllowedActions {
  if (Array.isArray(raw)) {
    const map: DiagnosticAllowedActions = {};
    for (const item of raw) {
      if (typeof item === 'string' && item) map[item] = true;
    }
    return map;
  }
  const record = asRecord(raw);
  if (!record) return {};
  const map: DiagnosticAllowedActions = {};
  for (const [key, value] of Object.entries(record)) {
    map[key] = Boolean(value);
  }
  return map;
}

export function normalizeDiagnosticCompletion(raw: unknown): DiagnosticCompletion {
  const data = asRecord(raw) ?? {};
  const distRaw = asRecord(data.score_distribution) ?? {};
  const score_distribution = emptyDistribution();
  for (let score = 1; score <= 10; score += 1) {
    const key = String(score);
    score_distribution[key] = asNumber(distRaw[key], 0);
  }
  return {
    students_total: asNumber(data.students_total),
    scored_count: asNumber(data.scored_count),
    absent_count: asNumber(data.absent_count),
    incomplete_count: asNumber(data.incomplete_count),
    not_entered_count: asNumber(data.not_entered_count),
    resolved_count: asNumber(data.resolved_count),
    completion_percent: asNumber(data.completion_percent),
    average_score: asNullableNumber(data.average_score),
    score_distribution,
  };
}

export function normalizeScoreScale(raw: unknown): DiagnosticScoreScaleItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const score = asNumber(row.score, 0);
      if (score < 1 || score > 10) return null;
      return {
        score,
        phrase: typeof row.phrase === 'string' ? row.phrase : '',
      };
    })
    .filter((item): item is DiagnosticScoreScaleItem => item != null)
    .sort((a, b) => a.score - b.score);
}

export function normalizeDiagnosticLine(raw: unknown): DiagnosticAssessmentLine {
  const data = asRecord(raw) ?? {};
  const studentRaw = asRecord(data.student) ?? {};
  return {
    id: asNumber(data.id),
    roster_sequence: asNumber(data.roster_sequence),
    student: {
      id: asNumber(studentRaw.id),
      name: typeof studentRaw.name === 'string' ? studentRaw.name : '',
      code: typeof studentRaw.code === 'string' ? studentRaw.code : null,
      massar_code:
        typeof studentRaw.massar_code === 'string' ? studentRaw.massar_code : null,
    },
    enrollment_id: asNullableNumber(data.enrollment_id),
    participation_state:
      typeof data.participation_state === 'string'
        ? data.participation_state
        : 'not_entered',
    score: asNullableNumber(data.score),
    phrase: typeof data.phrase === 'string' ? data.phrase : null,
    teacher_note: typeof data.teacher_note === 'string' ? data.teacher_note : null,
    is_resolved: Boolean(data.is_resolved),
  };
}

export function normalizeDiagnosticListItem(raw: unknown): DiagnosticAssessmentSummary {
  const data = asRecord(raw) ?? {};
  return {
    id: asNumber(data.id),
    display_name: typeof data.display_name === 'string' ? data.display_name : null,
    name: typeof data.name === 'string' ? data.name : null,
    assessment_date: typeof data.assessment_date === 'string' ? data.assessment_date : null,
    state: typeof data.state === 'string' ? data.state : 'draft',
    school: (data.school as DiagnosticAssessmentSummary['school']) ?? null,
    academic_year: (data.academic_year as DiagnosticAssessmentSummary['academic_year']) ?? null,
    class: (data.class as DiagnosticAssessmentSummary['class']) ?? null,
    level: (data.level as DiagnosticAssessmentSummary['level']) ?? null,
    subject: (data.subject as DiagnosticAssessmentSummary['subject']) ?? null,
    teacher: (data.teacher as DiagnosticAssessmentSummary['teacher']) ?? null,
    completion: normalizeDiagnosticCompletion(data.completion),
    allowed_actions: normalizeDiagnosticAllowedActions(data.allowed_actions),
  };
}

export function normalizeDiagnosticDetail(raw: unknown): DiagnosticAssessmentDetail {
  const base = normalizeDiagnosticListItem(raw);
  const data = asRecord(raw) ?? {};
  const lines = Array.isArray(data.lines) ? data.lines.map(normalizeDiagnosticLine) : [];
  return {
    ...base,
    notes: typeof data.notes === 'string' ? data.notes : null,
    score_scale: normalizeScoreScale(data.score_scale),
    lines,
    confirmed_by: (data.confirmed_by as DiagnosticAssessmentDetail['confirmed_by']) ?? null,
    confirmed_date: typeof data.confirmed_date === 'string' ? data.confirmed_date : null,
  };
}

export function normalizeBatchUpdateLinesResponse(
  raw: unknown,
): BatchUpdateDiagnosticLinesResponse {
  const data = asRecord(raw) ?? {};
  return {
    updated_count: asNumber(data.updated_count),
    lines: Array.isArray(data.lines) ? data.lines.map(normalizeDiagnosticLine) : [],
    completion: normalizeDiagnosticCompletion(data.completion),
  };
}

export function normalizePrintPayload(raw: unknown): DiagnosticPrintPayload {
  const data = asRecord(raw) ?? {};
  const assessment = asRecord(data.assessment) ?? {};
  const lines = Array.isArray(data.lines)
    ? data.lines.map((item) => {
        const row = asRecord(item) ?? {};
        return {
          roster_sequence: asNumber(row.roster_sequence),
          student_name: typeof row.student_name === 'string' ? row.student_name : '',
          student_code: typeof row.student_code === 'string' ? row.student_code : null,
          participation_state:
            typeof row.participation_state === 'string'
              ? row.participation_state
              : 'not_entered',
          score: asNullableNumber(row.score),
          phrase: typeof row.phrase === 'string' ? row.phrase : null,
          teacher_note: typeof row.teacher_note === 'string' ? row.teacher_note : null,
        };
      })
    : [];
  return {
    assessment: {
      id: asNumber(assessment.id),
      title: typeof assessment.title === 'string' ? assessment.title : '',
      assessment_date:
        typeof assessment.assessment_date === 'string' ? assessment.assessment_date : null,
      state: typeof assessment.state === 'string' ? assessment.state : 'draft',
      school: (assessment.school as DiagnosticPrintPayload['assessment']['school']) ?? null,
      academic_year:
        (assessment.academic_year as DiagnosticPrintPayload['assessment']['academic_year']) ??
        null,
      class: (assessment.class as DiagnosticPrintPayload['assessment']['class']) ?? null,
      level: (assessment.level as DiagnosticPrintPayload['assessment']['level']) ?? null,
      subject: (assessment.subject as DiagnosticPrintPayload['assessment']['subject']) ?? null,
      teacher: (assessment.teacher as DiagnosticPrintPayload['assessment']['teacher']) ?? null,
    },
    score_scale: normalizeScoreScale(data.score_scale),
    summary: normalizeDiagnosticCompletion(data.summary),
    lines,
  };
}
