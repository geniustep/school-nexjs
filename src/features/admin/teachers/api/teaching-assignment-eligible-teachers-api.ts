import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/types/api';
import type {
  TeachingAssignmentCandidate,
  TeachingAssignmentCandidateReason,
  TeachingAssignmentCandidateState,
  TeachingAssignmentCandidatesQuery,
  TeachingAssignmentCandidatesResponse,
  TeachingAssignmentCandidatesSummary,
  TeachingAssignmentWritePayload,
} from '@/types/teacher-domain';
import type { TeachingAssignment } from '@/types/academic-setup';

const CANDIDATE_STATES: TeachingAssignmentCandidateState[] = [
  'eligible',
  'eligible_with_warning',
  'override_required',
  'not_eligible',
];

function asReasonList(raw: unknown): TeachingAssignmentCandidateReason[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => ({
      code: String(row.code ?? ''),
      message: typeof row.message === 'string' ? row.message : null,
      severity: typeof row.severity === 'string' ? row.severity : null,
      details:
        row.details && typeof row.details === 'object'
          ? (row.details as Record<string, unknown>)
          : null,
    }))
    .filter((row) => row.code);
}

function asState(raw: unknown): TeachingAssignmentCandidateState | null {
  return typeof raw === 'string' &&
    (CANDIDATE_STATES as string[]).includes(raw)
    ? (raw as TeachingAssignmentCandidateState)
    : null;
}

function asNumberOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function normalizeTeachingAssignmentCandidate(
  raw: unknown,
): TeachingAssignmentCandidate | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const teacherId = Number(row.teacher_id);
  const state = asState(row.eligibility_state);
  if (!Number.isFinite(teacherId) || teacherId <= 0 || !state) return null;

  const actionsRaw =
    row.allowed_actions && typeof row.allowed_actions === 'object'
      ? (row.allowed_actions as Record<string, unknown>)
      : {};

  return {
    teacher_id: teacherId,
    display_name: typeof row.display_name === 'string' ? row.display_name : null,
    teacher_type: typeof row.teacher_type === 'string' ? row.teacher_type : null,
    eligibility_state: state,
    eligible: Boolean(row.eligible),
    can_assign: Boolean(row.can_assign),
    requires_override: Boolean(row.requires_override),
    blocking_reasons: asReasonList(row.blocking_reasons),
    warning_reasons: asReasonList(row.warning_reasons),
    override_reasons: asReasonList(row.override_reasons),
    informational_reasons: asReasonList(row.informational_reasons),
    eligibility_dimensions:
      row.eligibility_dimensions && typeof row.eligibility_dimensions === 'object'
        ? (row.eligibility_dimensions as TeachingAssignmentCandidate['eligibility_dimensions'])
        : undefined,
    current_weekly_load: asNumberOrNull(row.current_weekly_load),
    maximum_weekly_load: asNumberOrNull(row.maximum_weekly_load),
    target_weekly_load: asNumberOrNull(row.target_weekly_load),
    remaining_weekly_capacity: asNumberOrNull(row.remaining_weekly_capacity),
    availability_state:
      typeof row.availability_state === 'string' ? row.availability_state : null,
    has_assignment_conflict: Boolean(row.has_assignment_conflict),
    has_timetable_conflict:
      row.has_timetable_conflict === null || row.has_timetable_conflict === undefined
        ? null
        : Boolean(row.has_timetable_conflict),
    role: typeof row.role === 'string' ? row.role : null,
    allowed_actions: {
      can_assign: actionsRaw.can_assign === true,
      requires_override: actionsRaw.requires_override === true,
      can_override: actionsRaw.can_override === true,
    },
  };
}

function emptySummary(): TeachingAssignmentCandidatesSummary {
  return {
    total_candidates: 0,
    eligible_count: 0,
    eligible_with_warning_count: 0,
    override_required_count: 0,
    not_eligible_count: 0,
  };
}

export function normalizeTeachingAssignmentCandidatesResponse(
  raw: unknown,
): TeachingAssignmentCandidatesResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const candidates = Array.isArray(row.candidates)
    ? row.candidates
        .map((item) => normalizeTeachingAssignmentCandidate(item))
        .filter((item): item is TeachingAssignmentCandidate => item != null)
    : [];

  const summaryRaw =
    row.summary && typeof row.summary === 'object'
      ? (row.summary as Record<string, unknown>)
      : {};
  const summary: TeachingAssignmentCandidatesSummary = {
    total_candidates: Number(summaryRaw.total_candidates) || 0,
    eligible_count: Number(summaryRaw.eligible_count) || 0,
    eligible_with_warning_count: Number(summaryRaw.eligible_with_warning_count) || 0,
    override_required_count: Number(summaryRaw.override_required_count) || 0,
    not_eligible_count: Number(summaryRaw.not_eligible_count) || 0,
  };

  const allowed =
    row.allowed_actions && typeof row.allowed_actions === 'object'
      ? (row.allowed_actions as Record<string, unknown>)
      : {};

  return {
    context:
      row.context && typeof row.context === 'object'
        ? (row.context as Record<string, unknown>)
        : undefined,
    summary: Object.keys(summaryRaw).length ? summary : emptySummary(),
    candidates,
    filters_applied:
      row.filters_applied && typeof row.filters_applied === 'object'
        ? (row.filters_applied as Record<string, unknown>)
        : undefined,
    allowed_actions: {
      can_view_candidates: allowed.can_view_candidates === true,
      can_create_assignment: allowed.can_create_assignment === true,
      can_override_assignment_eligibility:
        allowed.can_override_assignment_eligibility === true,
      can_view_ineligible_candidates: allowed.can_view_ineligible_candidates === true,
    },
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
    pagination:
      row.pagination && typeof row.pagination === 'object'
        ? (row.pagination as TeachingAssignmentCandidatesResponse['pagination'])
        : undefined,
    contract:
      row.contract && typeof row.contract === 'object'
        ? (row.contract as TeachingAssignmentCandidatesResponse['contract'])
        : undefined,
  };
}

export function buildEligibleTeachersQuery(
  input: TeachingAssignmentCandidatesQuery,
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    class_id: input.class_id,
    subject_id: input.subject_id,
  };
  const optionalNumberKeys = [
    'academic_year_id',
    'teaching_offering_id',
    'weekly_hours',
    'page',
    'page_size',
  ] as const;
  for (const key of optionalNumberKeys) {
    const value = input[key];
    if (value != null && Number.isFinite(Number(value))) query[key] = Number(value);
  }
  if (input.role?.trim()) query.role = input.role.trim();
  if (input.effective_from?.trim()) query.effective_from = input.effective_from.trim();
  if (input.effective_to?.trim()) query.effective_to = input.effective_to.trim();
  if (input.weekday != null && input.weekday !== '') query.weekday = String(input.weekday);
  if (input.time_from?.trim()) query.time_from = input.time_from.trim();
  if (input.time_to?.trim()) query.time_to = input.time_to.trim();
  if (input.include_ineligible === true) query.include_ineligible = 'true';
  return query;
}

export async function fetchTeachingAssignmentEligibleTeachers(
  input: TeachingAssignmentCandidatesQuery,
): Promise<ApiResponse<TeachingAssignmentCandidatesResponse>> {
  const query = buildEligibleTeachersQuery(input);
  const res = await api.get<unknown>(
    endpoints.admin.teachingAssignmentEligibleTeachers,
    query,
  );
  if (!res.success) return res as ApiResponse<TeachingAssignmentCandidatesResponse>;
  const data = normalizeTeachingAssignmentCandidatesResponse(res.data);
  if (!data) {
    return {
      success: false,
      error: {
        code: 'invalid_payload',
        message: 'Invalid eligible-teachers payload.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data };
}

export function buildAssignmentMutationPayload(
  payload: TeachingAssignmentWritePayload,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    body[key] = value;
  }
  // Never trust client-side eligibility decisions as write facts.
  delete body.can_assign;
  delete body.eligible;
  delete body.eligibility_state;
  delete body.blocking_reasons;
  delete body.warning_reasons;
  delete body.informational_reasons;
  delete body.override_rule_codes;
  if (body.override !== true) {
    delete body.override;
    delete body.override_reason;
  } else if (typeof body.override_reason === 'string') {
    body.override_reason = body.override_reason.trim();
  }
  return body;
}

export async function createTeachingAssignmentWithEligibility(
  payload: TeachingAssignmentWritePayload,
): Promise<ApiResponse<TeachingAssignment>> {
  return api.post<TeachingAssignment>(
    endpoints.admin.teachingAssignments,
    buildAssignmentMutationPayload(payload),
  );
}

export async function updateTeachingAssignmentWithEligibility(
  id: number,
  payload: Partial<TeachingAssignmentWritePayload> & { teacher_id?: number },
): Promise<ApiResponse<TeachingAssignment>> {
  return api.post<TeachingAssignment>(
    endpoints.admin.teachingAssignmentUpdate(id),
    buildAssignmentMutationPayload(payload as TeachingAssignmentWritePayload),
  );
}
