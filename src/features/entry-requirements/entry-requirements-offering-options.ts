import type { TeachingOfferingChoice } from '@/features/entry-requirements/entry-requirements-contract';

export type TeachingOfferingSubjectOption = {
  id: number;
  name: string;
};

export function approvedTeachingOfferings(
  rows: readonly TeachingOfferingChoice[],
): TeachingOfferingChoice[] {
  return rows.filter((row) => Boolean(row.reference.id) && row.reference.status === 'approved');
}

export function teachingOfferingSubjects(
  rows: readonly TeachingOfferingChoice[],
): TeachingOfferingSubjectOption[] {
  const subjects = new Map<number, TeachingOfferingSubjectOption>();

  for (const row of approvedTeachingOfferings(rows)) {
    if (!row.subject_id) continue;
    const name = (row.subject ?? '').trim() || `#${row.subject_id}`;
    if (!subjects.has(row.subject_id)) {
      subjects.set(row.subject_id, { id: row.subject_id, name });
    }
  }

  return [...subjects.values()].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export function teachingOfferingsForSubject(
  rows: readonly TeachingOfferingChoice[],
  subjectId: number | string | null | undefined,
): TeachingOfferingChoice[] {
  const parsed = Number(subjectId || 0);
  if (!parsed) return [];

  return approvedTeachingOfferings(rows)
    .filter((row) => row.subject_id === parsed)
    .sort((a, b) => {
      const left = `${a.reference.title ?? ''} ${a.reference.edition ?? ''}`.trim();
      const right = `${b.reference.title ?? ''} ${b.reference.edition ?? ''}`.trim();
      return left.localeCompare(right, 'ar');
    });
}
