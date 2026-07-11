import { describe, expect, it } from 'vitest';
import {
  familyBatchSiblingApplications,
  orderFamilyBatchApplicationsForCurrentChild,
} from './family-batch-current-child';

describe('orderFamilyBatchApplicationsForCurrentChild', () => {
  it('keeps route child first even when sibling is first in API array', () => {
    const apps = [
      { id: 100, student_name: 'Sibling First' },
      { id: 200, student_name: 'Opened Child' },
    ];
    const ordered = orderFamilyBatchApplicationsForCurrentChild(apps, 200);
    expect(ordered.map((a) => a.id)).toEqual([200, 100]);
    expect(ordered[0].student_name).toBe('Opened Child');
  });

  it('does not treat first array item as current child', () => {
    const apps = [
      { id: 1, student_name: 'A' },
      { id: 2, student_name: 'B' },
      { id: 3, student_name: 'C' },
    ];
    const ordered = orderFamilyBatchApplicationsForCurrentChild(apps, 3);
    expect(ordered[0].id).toBe(3);
    expect(familyBatchSiblingApplications(ordered, 3).map((a) => a.id)).toEqual([1, 2]);
  });

  it('keeps stable order when current id is absent', () => {
    const apps = [
      { id: 10, student_name: 'X' },
      { id: 11, student_name: 'Y' },
    ];
    expect(orderFamilyBatchApplicationsForCurrentChild(apps, 999).map((a) => a.id)).toEqual([
      10, 11,
    ]);
  });
});
