/**
 * Teacher planning workspace URL helpers (class / offering context in query).
 */

export type TeacherPlanningQuery = {
  classId?: string | number | null;
  offeringId?: string | number | null;
  academicYearId?: string | number | null;
  returnTo?: string | null;
};

function positiveId(value: string | number | null | undefined): string | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(Math.trunc(n));
}

export function buildTeacherPlanningHref(params: TeacherPlanningQuery = {}): string {
  const q = new URLSearchParams();
  const classId = positiveId(params.classId);
  const offeringId = positiveId(params.offeringId);
  const academicYearId = positiveId(params.academicYearId);
  if (classId) q.set('class_id', classId);
  if (offeringId) q.set('offering_id', offeringId);
  if (academicYearId) q.set('academic_year_id', academicYearId);
  if (params.returnTo && params.returnTo.startsWith('/') && !params.returnTo.startsWith('//')) {
    q.set('return_to', params.returnTo);
  }
  const qs = q.toString();
  return qs ? `/teacher/teaching/planning?${qs}` : '/teacher/teaching/planning';
}

export function parseTeacherPlanningQuery(search: URLSearchParams | { get(name: string): string | null }): {
  classId: string;
  offeringId: string;
  academicYearId: string;
  returnTo: string | null;
} {
  return {
    classId: positiveId(search.get('class_id')) ?? '',
    offeringId: positiveId(search.get('offering_id')) ?? '',
    academicYearId: positiveId(search.get('academic_year_id')) ?? '',
    returnTo: (() => {
      const raw = search.get('return_to');
      if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
      return raw;
    })(),
  };
}

export function sessionHubHref(
  occurrenceId: number,
  tab?: 'jathatha' | 'delivery' | 'journal' | 'overview',
  returnTo?: string | null,
): string {
  const q = new URLSearchParams();
  if (tab && tab !== 'overview') q.set('tab', tab);
  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    q.set('return_to', returnTo);
  }
  const qs = q.toString();
  return qs ? `/teacher/sessions/${occurrenceId}?${qs}` : `/teacher/sessions/${occurrenceId}`;
}
