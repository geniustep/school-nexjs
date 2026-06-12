import { describe, expect, it } from 'vitest';
import { groupSetupIssues } from './issue-grouping';
import type { SetupReadinessIssue } from '@/types/academic-setup';

function issue(partial: Partial<SetupReadinessIssue> & Pick<SetupReadinessIssue, 'id' | 'code'>): SetupReadinessIssue {
  return {
    severity: 'warning',
    blocking: false,
    title: partial.code,
    domain: 'classes',
    target: { section: 'classes' },
    ...partial,
  };
}

describe('groupSetupIssues', () => {
  it('groups issues by code with count and samples', () => {
    const groups = groupSetupIssues([
      issue({ id: '1', code: 'level_without_classes', context: { level_name: 'PRE1' } }),
      issue({ id: '2', code: 'level_without_classes', context: { level_name: 'PRE2' } }),
      issue({ id: '3', code: 'level_without_classes', context: { level_name: 'P1' } }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(3);
    expect(groups[0].sampleNames).toEqual(['PRE1', 'PRE2', 'P1']);
  });

  it('limits to max groups', () => {
    const groups = groupSetupIssues(
      [
        issue({ id: '1', code: 'a' }),
        issue({ id: '2', code: 'b' }),
        issue({ id: '3', code: 'c' }),
        issue({ id: '4', code: 'd' }),
      ],
      2,
    );
    expect(groups).toHaveLength(2);
  });
});
