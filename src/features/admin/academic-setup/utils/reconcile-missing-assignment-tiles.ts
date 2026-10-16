import type { SetupReadinessIssue, TeachingAssignment } from '@/types/academic-setup';

function normalizedName(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ') : '';
}

function issueSubjectId(issue: SetupReadinessIssue): number | null {
  const raw = issue.target.query?.subject_id ?? issue.context?.subject_id;
  if (raw == null || raw === '') return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Merge the visual warning with an existing assignment tile; never discard records/issues. */
export function reconcileMissingAssignmentTiles(
  assignments: TeachingAssignment[],
  issues: SetupReadinessIssue[],
): {
  standaloneIssues: SetupReadinessIssue[];
  issuesByAssignmentId: Map<number, SetupReadinessIssue[]>;
} {
  const bySubject = new Map<number, TeachingAssignment[]>();
  const idsByName = new Map<string, Set<number>>();
  for (const assignment of assignments) {
    const group = bySubject.get(assignment.subject.id) ?? [];
    group.push(assignment);
    bySubject.set(assignment.subject.id, group);
    const name = normalizedName(assignment.subject.name);
    const ids = idsByName.get(name) ?? new Set<number>();
    ids.add(assignment.subject.id);
    idsByName.set(name, ids);
  }
  const standaloneIssues: SetupReadinessIssue[] = [];
  const issuesByAssignmentId = new Map<number, SetupReadinessIssue[]>();
  for (const issue of issues) {
    let subjectId = issueSubjectId(issue);
    if (subjectId == null) {
      const name = normalizedName(issue.context?.subject_name ?? issue.title);
      const ids = idsByName.get(name);
      if (ids?.size === 1) subjectId = [...ids][0];
    }
    const rows = subjectId == null ? [] : bySubject.get(subjectId) ?? [];
    if (!rows.length) {
      standaloneIssues.push(issue);
      continue;
    }
    // Prefer the most recent matching assignment, retaining other historical rows.
    const chosen = [...rows].sort((a, b) => b.id - a.id)[0];
    const group = issuesByAssignmentId.get(chosen.id) ?? [];
    group.push(issue);
    issuesByAssignmentId.set(chosen.id, group);
  }
  return { standaloneIssues, issuesByAssignmentId };
}
