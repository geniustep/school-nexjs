import type {
  FeePlanEligibleStudent,
  FeePlanEligibleStudentsResponse,
  FeePlanEligibilityPagination,
  FeePlanEligibilitySummary,
} from '@/types/fee-plan-eligible-students';

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function normalizeLevel(raw: unknown): FeePlanEligibleStudent['level'] {
  const o = readRecord(raw);
  const id = Number(o.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    code: typeof o.code === 'string' ? o.code : undefined,
    name: typeof o.name === 'string' ? o.name : undefined,
    display_alias: typeof o.display_alias === 'string' ? o.display_alias : undefined,
  };
}

function normalizeClass(raw: unknown): FeePlanEligibleStudent['class'] {
  const o = readRecord(raw);
  const id = Number(o.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    code: typeof o.code === 'string' ? o.code : undefined,
    name: typeof o.name === 'string' ? o.name : undefined,
    display_name: typeof o.display_name === 'string' ? o.display_name : undefined,
    level: normalizeLevel(o.level),
  };
}

export function normalizeFeePlanEligibleStudent(raw: unknown): FeePlanEligibleStudent | null {
  const o = readRecord(raw);
  const id = Number(o.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  if (typeof o.name !== 'string' || !o.name.trim()) return null;
  if (typeof o.eligibility_status !== 'string' || !o.eligibility_status.trim()) return null;
  if (typeof o.selectable !== 'boolean') return null;
  if (typeof o.already_assigned !== 'boolean') return null;
  if (typeof o.billing_ready !== 'boolean') return null;
  if (typeof o.billing_will_be_created_automatically !== 'boolean') return null;

  return {
    id,
    name: o.name.trim(),
    registration_number:
      typeof o.registration_number === 'string' ? o.registration_number : o.registration_number === null ? null : undefined,
    academic_year_id: Number.isFinite(Number(o.academic_year_id)) ? Number(o.academic_year_id) : null,
    level: o.level === null ? null : normalizeLevel(o.level),
    class: o.class === null ? null : normalizeClass(o.class),
    enrollment_status: typeof o.enrollment_status === 'string' ? o.enrollment_status : null,
    eligibility_status: o.eligibility_status,
    eligibility_reason:
      typeof o.eligibility_reason === 'string'
        ? o.eligibility_reason
        : o.eligibility_reason === null
          ? null
          : undefined,
    selectable: o.selectable,
    already_assigned: o.already_assigned,
    billing_ready: o.billing_ready,
    billing_will_be_created_automatically: o.billing_will_be_created_automatically,
  };
}

function normalizeSummary(raw: unknown): FeePlanEligibilitySummary {
  const o = readRecord(raw);
  return {
    eligible_count: Number.isFinite(Number(o.eligible_count)) ? Number(o.eligible_count) : 0,
    already_assigned_count: Number.isFinite(Number(o.already_assigned_count))
      ? Number(o.already_assigned_count)
      : 0,
    ineligible_count: Number.isFinite(Number(o.ineligible_count)) ? Number(o.ineligible_count) : 0,
  };
}

export function normalizeFeePlanEligibilityPagination(
  raw: unknown,
  fallbackPageSize = 25,
): FeePlanEligibilityPagination {
  const o = readRecord(raw);
  const page = Number.isFinite(Number(o.page)) && Number(o.page) > 0 ? Number(o.page) : 1;
  const page_size =
    Number.isFinite(Number(o.page_size)) && Number(o.page_size) > 0
      ? Number(o.page_size)
      : fallbackPageSize;
  const total = Number.isFinite(Number(o.total)) && Number(o.total) >= 0 ? Number(o.total) : 0;
  const total_pages = Math.max(1, Math.ceil(total / page_size) || 1);
  return { page, page_size, total, total_pages };
}

export function normalizeFeePlanEligibleStudentsResponse(
  raw: unknown,
): FeePlanEligibleStudentsResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const studentsRaw = Array.isArray(o.students) ? o.students : [];
  const students: FeePlanEligibleStudent[] = [];
  for (const entry of studentsRaw) {
    const student = normalizeFeePlanEligibleStudent(entry);
    if (student) students.push(student);
  }

  return {
    plan: readRecord(o.plan) as FeePlanEligibleStudentsResponse['plan'],
    summary: normalizeSummary(o.summary),
    students,
    pagination: normalizeFeePlanEligibilityPagination(o.pagination),
  };
}
