import type { ApiResponse } from '@/types/api';
import type {
  ApiContractMetadata,
  TeacherAcademicProfile,
  TeacherAssignmentDetail,
  TeacherAssignmentSummary,
  TeacherDetail,
  TeacherSummary,
  TeachingOfferingDetail,
  TeachingOfferingSummary,
} from '@/types/teacher-domain';
import {
  TEACHER_DOMAIN_CONTRACT_VERSION,
} from '@/types/teacher-domain';
import { normalizeAllowedActions } from './teacher-domain-allowed-actions';

const FORBIDDEN_ACADEMIC_WRITE_KEYS = [
  'assignment_ids',
  'current_assignments',
  'class_ids',
  'timetable_slots',
  'operational_derived',
  'derived_workload',
] as const;

export type TeacherDomainContractCheck = {
  ok: boolean;
  version: string | null;
  genericOrm: boolean | null;
  missingRequired: string[];
  additiveCompatible: boolean;
};

export function parseTeacherDomainContract(
  raw: unknown,
): ApiContractMetadata | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as ApiContractMetadata;
}

export function checkTeacherDomainContract(
  raw: unknown,
): TeacherDomainContractCheck {
  const contract = parseTeacherDomainContract(raw);
  const version =
    typeof contract?.contract_version === 'string' ? contract.contract_version : null;
  const missingRequired: string[] = [];
  if (!version) missingRequired.push('contract_version');
  if (!contract?.contract_name) missingRequired.push('contract_name');
  if (contract?.generic_orm_endpoint === undefined) {
    missingRequired.push('generic_orm_endpoint');
  }
  const genericOrm =
    typeof contract?.generic_orm_endpoint === 'boolean'
      ? contract.generic_orm_endpoint
      : null;
  const additiveCompatible =
    version === TEACHER_DOMAIN_CONTRACT_VERSION ||
    contract?.compatibility === 'backward_compatible_additive';
  const ok =
    missingRequired.length === 0 &&
    genericOrm === false &&
    (version === TEACHER_DOMAIN_CONTRACT_VERSION || additiveCompatible);

  return {
    ok,
    version,
    genericOrm,
    missingRequired,
    additiveCompatible,
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeTeacherSummary(raw: unknown): TeacherSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as TeacherSummary;
  if (typeof row.id !== 'number') return null;
  return {
    ...row,
    name: row.name ?? '',
    code: row.code ?? null,
    status: row.status ?? 'unknown',
    subjects: asArray(row.subjects),
    classes: asArray(row.classes),
    warnings: asArray(row.warnings),
    allowed_actions: normalizeAllowedActions(row.allowed_actions),
  };
}

export function normalizeTeacherSummaries(raw: unknown): TeacherSummary[] {
  return asArray(raw)
    .map((item) => normalizeTeacherSummary(item))
    .filter((item): item is TeacherSummary => item != null);
}

export function normalizeTeacherDetail(raw: unknown): TeacherDetail | null {
  const summary = normalizeTeacherSummary(raw);
  if (!summary) return null;
  const row = raw as TeacherDetail;
  return {
    ...row,
    ...summary,
    assignments: asArray(row.assignments),
    availability: asArray(row.availability),
    academic_qualifications: asArray(row.academic_qualifications),
    eligible_levels: asArray(row.eligible_levels),
    eligible_cycles: asArray(row.eligible_cycles),
    teaching_languages: asArray(row.teaching_languages),
  };
}

export function normalizeAcademicProfile(raw: unknown): TeacherAcademicProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as TeacherAcademicProfile;
  const teacherId = Number(row.teacher_id);
  if (!Number.isFinite(teacherId)) return null;

  const eligibilityDimensions =
    row.eligibility_dimensions ?? row.eligibility?.eligibility_dimensions ?? undefined;
  const completenessWarnings = asArray(
    row.completeness_warnings,
  ) as TeacherAcademicProfile['completeness_warnings'];
  const mismatch = row.assignment_mismatch_summary;
  const assignmentMismatchSummary: TeacherAcademicProfile['assignment_mismatch_summary'] =
    mismatch && typeof mismatch === 'object'
      ? {
          count: Number(mismatch.count) || 0,
          warnings: asArray(mismatch.warnings) as NonNullable<
            TeacherAcademicProfile['assignment_mismatch_summary']
          >['warnings'],
          mutates_assignment: mismatch.mutates_assignment,
          source: mismatch.source,
        }
      : mismatch === null
        ? null
        : undefined;

  return {
    ...row,
    teacher_id: teacherId,
    eligibility_dimensions: eligibilityDimensions,
    completeness_warnings: completenessWarnings,
    assignment_mismatch_summary: assignmentMismatchSummary,
    qualifications: asArray(row.qualifications),
    availability: asArray(row.availability),
    current_assignments: asArray(row.current_assignments),
    eligibility_warnings: asArray(row.eligibility_warnings),
    availability_conflicts: asArray(row.availability_conflicts),
    warnings: asArray(row.warnings),
    allowed_actions: normalizeAllowedActions(row.allowed_actions),
  };
}

export function normalizeAssignmentSummary(raw: unknown): TeacherAssignmentSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as TeacherAssignmentSummary;
  if (typeof row.id !== 'number') return null;
  return {
    ...row,
    warnings: asArray(row.warnings),
    structured_warnings: asArray(row.structured_warnings),
    eligibility_warnings: asArray(row.eligibility_warnings),
    allowed_actions: normalizeAllowedActions(row.allowed_actions),
  };
}

export function normalizeAssignmentSummaries(raw: unknown): TeacherAssignmentSummary[] {
  return asArray(raw)
    .map((item) => normalizeAssignmentSummary(item))
    .filter((item): item is TeacherAssignmentSummary => item != null);
}

export function normalizeAssignmentDetail(raw: unknown): TeacherAssignmentDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const envelope = raw as { item?: unknown };
  const payload = envelope.item ?? raw;
  const summary = normalizeAssignmentSummary(payload);
  if (!summary) return null;
  return { ...(payload as TeacherAssignmentDetail), ...summary };
}

export function normalizeOfferingSummary(raw: unknown): TeachingOfferingSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as TeachingOfferingSummary;
  if (typeof row.id !== 'number') return null;
  return {
    ...row,
    warnings: asArray(row.warnings),
    allowed_actions: normalizeAllowedActions(row.allowed_actions),
  };
}

export function normalizeOfferingSummaries(raw: unknown): TeachingOfferingSummary[] {
  return asArray(raw)
    .map((item) => normalizeOfferingSummary(item))
    .filter((item): item is TeachingOfferingSummary => item != null);
}

export function normalizeOfferingDetail(raw: unknown): TeachingOfferingDetail | null {
  const summary = normalizeOfferingSummary(raw);
  if (!summary) return null;
  const row = raw as TeachingOfferingDetail;
  return {
    ...row,
    ...summary,
    assignments: asArray(row.assignments),
    activation_blockers: asArray(row.activation_blockers),
  };
}

export function stripForbiddenAcademicWriteKeys(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...payload };
  for (const key of FORBIDDEN_ACADEMIC_WRITE_KEYS) {
    delete next[key];
  }
  return next;
}

export function withNormalizedTeacherDetail(
  res: ApiResponse<unknown>,
): ApiResponse<TeacherDetail> {
  if (!res.success) return res as ApiResponse<TeacherDetail>;
  const detail = normalizeTeacherDetail(res.data);
  if (!detail) {
    return {
      success: false,
      error: {
        code: 'invalid_payload',
        message: 'Invalid teacher detail payload.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: detail };
}

export function withNormalizedAcademicProfile(
  res: ApiResponse<unknown>,
): ApiResponse<TeacherAcademicProfile> {
  if (!res.success) return res as ApiResponse<TeacherAcademicProfile>;
  const profile = normalizeAcademicProfile(res.data);
  if (!profile) {
    return {
      success: false,
      error: {
        code: 'invalid_payload',
        message: 'Invalid academic profile payload.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: profile };
}

export function withNormalizedAssignmentDetail(
  res: ApiResponse<unknown>,
): ApiResponse<TeacherAssignmentDetail> {
  if (!res.success) return res as ApiResponse<TeacherAssignmentDetail>;
  const detail = normalizeAssignmentDetail(res.data);
  if (!detail) {
    return {
      success: false,
      error: {
        code: 'invalid_payload',
        message: 'Invalid teaching assignment payload.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: detail };
}
