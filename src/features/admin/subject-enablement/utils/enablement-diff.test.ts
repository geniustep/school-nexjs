import { describe, expect, it } from 'vitest';
import type { SubjectLevelEnablementRow } from '@/types/subject-enablement';
import { diffEnablementSelection, diffLevelEnablementSelection } from './enablement-diff';

const rows: SubjectLevelEnablementRow[] = [
  {
    operationalSubjectId: 5,
    name: 'عربية',
    code: 'AR',
    status: 'enabled',
    source: 'level',
    active: true,
  },
  {
    operationalSubjectId: 6,
    name: 'رياضيات',
    code: 'MATH',
    status: 'not_enabled',
    source: 'unknown',
    active: true,
  },
  {
    operationalSubjectId: 7,
    name: 'فرنسية',
    code: 'FR',
    status: 'enabled',
    source: 'level',
    active: true,
  },
];

describe('diffEnablementSelection', () => {
  it('computes enable / disable / unchanged without implying a POST', () => {
    const draft = new Set([5, 6]); // enable 6, disable 7, keep 5
    const summary = diffEnablementSelection(rows, draft);
    expect(summary.enableIds).toEqual([6]);
    expect(summary.disableIds).toEqual([7]);
    expect(summary.unchangedIds).toEqual([5]);
    expect(summary.dirty).toBe(true);
  });

  it('is not dirty when draft matches server', () => {
    const draft = new Set([5, 7]);
    expect(diffEnablementSelection(rows, draft).dirty).toBe(false);
  });
});

describe('diffLevelEnablementSelection', () => {
  it('diffs levels for subject-centric editor using same summary shape', () => {
    const summary = diffLevelEnablementSelection(
      [1, 2, 3],
      new Set([1]),
      new Set([1, 2]),
    );
    expect(summary.enableIds).toEqual([2]);
    expect(summary.disableIds).toEqual([]);
    expect(summary.unchangedIds).toEqual([1, 3]);
  });
});
