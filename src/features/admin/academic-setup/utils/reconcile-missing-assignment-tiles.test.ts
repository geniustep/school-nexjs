import { describe, expect, it } from 'vitest';
import type { SetupReadinessIssue, TeachingAssignment } from '@/types/academic-setup';
import { reconcileMissingAssignmentTiles } from './reconcile-missing-assignment-tiles';

const assignment = (id: number, subjectId: number, name: string) =>
  ({ id, subject: { id: subjectId, name } } as TeachingAssignment);
const issue = (id: string, subjectId?: number, subjectName = 'المعلوميات') =>
  ({
    id, code: 'assignment_missing', severity: 'warning', blocking: false,
    title: subjectName, domain: 'assignments',
    context: { subject_name: subjectName },
    target: { section: 'assignments', query: subjectId ? { subject_id: subjectId } : {} },
  } as SetupReadinessIssue);

describe('reconcileMissingAssignmentTiles', () => {
  it('attaches expired ICT warning to existing ICT assignment without a duplicate tile', () => {
    const result = reconcileMissingAssignmentTiles([assignment(98, 70, 'المعلوميات')], [issue('missing-ict', 70)]);
    expect(result.standaloneIssues).toHaveLength(0);
    expect(result.issuesByAssignmentId.get(98)?.[0].id).toBe('missing-ict');
  });
  it('does not conceal a truly missing subject', () => {
    expect(reconcileMissingAssignmentTiles([assignment(98, 70, 'المعلوميات')], [issue('missing-math', 76, 'الرياضيات')]).standaloneIssues)
      .toHaveLength(1);
  });
  it('uses exact name only when there is no reliable subject id', () => {
    const result = reconcileMissingAssignmentTiles([assignment(98, 70, 'المعلوميات')], [issue('missing-ict')]);
    expect(result.standaloneIssues).toHaveLength(0);
  });
  it('retains ambiguous or mismatched warning records', () => {
    const rows = [assignment(98, 70, 'المعلوميات'), assignment(99, 71, 'المعلوميات')];
    expect(reconcileMissingAssignmentTiles(rows, [issue('ambiguous')]).standaloneIssues).toHaveLength(1);
  });
  it('combines warnings only with the newest matching assignment', () => {
    const result = reconcileMissingAssignmentTiles(
      [assignment(98, 70, 'المعلوميات'), assignment(149, 70, 'المعلوميات')],
      [issue('missing-ict', 70)],
    );
    expect(result.issuesByAssignmentId.get(149)).toHaveLength(1);
    expect(result.issuesByAssignmentId.get(98)).toBeUndefined();
  });
});
