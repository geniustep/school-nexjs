import { describe, expect, it } from 'vitest';
import {
  buildLevelsByIdFromLevels,
  filterSubjectsForList,
  groupSubjectsForList,
  inferSubjectTier,
  resolveSubjectLevelLabels,
} from './subjects-list-utils';
import type { Subject } from '@/types/class';

function subject(partial: Partial<Subject> & Pick<Subject, 'id' | 'name'>): Subject {
  return { code: null, ...partial };
}

const levels = buildLevelsByIdFromLevels([
  { id: 1, name: 'الأولى ابتدائي', code: 'P1' },
  { id: 2, name: 'الأولى إعدادي', code: 'M1' },
  { id: 3, name: 'الأولى باك', code: 'H1' },
]);

describe('inferSubjectTier', () => {
  it('reads tier from code suffix', () => {
    expect(inferSubjectTier(subject({ id: 1, name: 'X', code: 'MATH_PRIM' }), levels)).toBe('primary');
    expect(inferSubjectTier(subject({ id: 2, name: 'X', code: 'MATH_MID' }), levels)).toBe('middle');
    expect(inferSubjectTier(subject({ id: 3, name: 'X', code: 'HISTGEO_HIGH' }), levels)).toBe('high');
  });

  it('falls back to linked level codes', () => {
    expect(inferSubjectTier(subject({ id: 4, name: 'X', code: 'AR', level_ids: [2] }), levels)).toBe('middle');
  });
});

describe('resolveSubjectLevelLabels', () => {
  it('returns unique level labels', () => {
    expect(
      resolveSubjectLevelLabels(subject({ id: 1, name: 'X', level_ids: [1, 1] }), levels),
    ).toEqual(['الأولى ابتدائي']);
  });
});

describe('groupSubjectsForList', () => {
  it('groups by inferred tier without merging duplicate names', () => {
    const items = [
      subject({ id: 1, name: 'الرياضيات', code: 'MATH_PRIM' }),
      subject({ id: 2, name: 'الرياضيات', code: 'MATH_MID' }),
    ];
    const groups = groupSubjectsForList(items, levels);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.subjects).toHaveLength(1);
    expect(groups[1]?.subjects).toHaveLength(1);
  });
});

describe('filterSubjectsForList', () => {
  it('filters by search and tier', () => {
    const items = [
      subject({ id: 1, name: 'التاريخ', code: 'HIST_PRIM' }),
      subject({ id: 2, name: 'الرياضيات', code: 'MATH_MID' }),
    ];
    const midOnly = filterSubjectsForList(items, levels, '', 'middle');
    expect(midOnly).toHaveLength(1);
    expect(midOnly[0]?.code).toBe('MATH_MID');
  });
});
