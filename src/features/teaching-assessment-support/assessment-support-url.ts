/**
 * Teacher Assessment Support workspace URL helpers.
 * Context: academic_year_id + class_id + subject_id (Odoo 221 matrix).
 */

export type TeacherAssessmentSupportQuery = {
  classId?: string | number | null;
  subjectId?: string | number | null;
  academicYearId?: string | number | null;
  tab?: string | null;
  returnTo?: string | null;
};

function positiveId(value: string | number | null | undefined): string | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(Math.trunc(n));
}

const TABS = new Set([
  'objectives',
  'matrix',
  'difficulties',
  'decisions',
  'groups',
  'plans',
  'reassessments',
]);

export function safeInternalReturnTo(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

export function buildTeacherAssessmentSupportHref(
  params: TeacherAssessmentSupportQuery = {},
): string {
  const q = new URLSearchParams();
  const classId = positiveId(params.classId);
  const subjectId = positiveId(params.subjectId);
  const academicYearId = positiveId(params.academicYearId);
  if (classId) q.set('class_id', classId);
  if (subjectId) q.set('subject_id', subjectId);
  if (academicYearId) q.set('academic_year_id', academicYearId);
  if (params.tab && TABS.has(params.tab)) q.set('tab', params.tab);
  const returnTo = safeInternalReturnTo(params.returnTo ?? null);
  if (returnTo) q.set('return_to', returnTo);
  const qs = q.toString();
  return qs
    ? `/teacher/teaching/assessment-support?${qs}`
    : '/teacher/teaching/assessment-support';
}

export function parseTeacherAssessmentSupportQuery(
  search: URLSearchParams | { get(name: string): string | null },
): {
  classId: string;
  subjectId: string;
  academicYearId: string;
  tab: string;
  returnTo: string | null;
} {
  const tabRaw = search.get('tab') ?? 'matrix';
  return {
    classId: positiveId(search.get('class_id')) ?? '',
    subjectId: positiveId(search.get('subject_id')) ?? '',
    academicYearId: positiveId(search.get('academic_year_id')) ?? '',
    tab: TABS.has(tabRaw) ? tabRaw : 'matrix',
    returnTo: safeInternalReturnTo(search.get('return_to')),
  };
}

export function buildAdminAssessmentSupportHref(params: {
  classId?: string | number | null;
  subjectId?: string | number | null;
  academicYearId?: string | number | null;
} = {}): string {
  const q = new URLSearchParams();
  const classId = positiveId(params.classId);
  const subjectId = positiveId(params.subjectId);
  const academicYearId = positiveId(params.academicYearId);
  if (classId) q.set('class_id', classId);
  if (subjectId) q.set('subject_id', subjectId);
  if (academicYearId) q.set('academic_year_id', academicYearId);
  const qs = q.toString();
  return qs
    ? `/admin/teaching-planning/assessment-support?${qs}`
    : '/admin/teaching-planning/assessment-support';
}
