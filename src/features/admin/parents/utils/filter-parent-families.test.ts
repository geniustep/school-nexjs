import { describe, expect, it } from 'vitest';
import {
  countHiddenGuardianOnlyFamilies,
  filterParentFamilies,
} from '@/features/admin/parents/utils/filter-parent-families';
import type { ParentFamilyGroup } from '@/features/admin/parents/utils/group-parents-by-family';
import type { Parent } from '@/types/parent';

function makeFamily(children: Array<{ id: number; name: string }>, guardianNames: string[]): ParentFamilyGroup {
  return {
    id: children.map((c) => c.id).join('-') || 'solo',
    children: children.map((c) => ({ id: c.id, name: c.name, relationship: null })),
    guardians: guardianNames.map((name, index) => ({
      parent: {
        id: index + 1,
        name,
        phone: null,
        email: null,
        relation: null,
        status: 'active',
      } satisfies Parent,
      relationshipType: 'other',
    })),
  };
}

describe('filterParentFamilies hideWithoutChildren', () => {
  const withChildren = makeFamily([{ id: 10, name: 'ياسر' }], ['محمد']);
  const withoutChildren = makeFamily([], ['ولي بدون تلميذ']);

  it('hides guardian-only families by default', () => {
    const result = filterParentFamilies([withChildren, withoutChildren], {}, '');
    expect(result).toEqual([withChildren]);
  });

  it('shows guardian-only families when search matches', () => {
    const result = filterParentFamilies([withChildren, withoutChildren], {}, 'بدون');
    expect(result).toEqual([withoutChildren]);
  });

  it('shows guardian-only families when hideWithoutChildren is disabled', () => {
    const result = filterParentFamilies(
      [withChildren, withoutChildren],
      { hideWithoutChildren: false },
      '',
    );
    expect(result).toEqual([withChildren, withoutChildren]);
  });

  it('does not override explicit childrenFilter none', () => {
    const result = filterParentFamilies(
      [withChildren, withoutChildren],
      { childrenFilter: 'none' },
      '',
    );
    expect(result).toEqual([withoutChildren]);
  });
});

describe('countHiddenGuardianOnlyFamilies', () => {
  const withChildren = makeFamily([{ id: 10, name: 'ياسر' }], ['محمد']);
  const withoutChildren = makeFamily([], ['ولي بدون تلميذ']);

  it('counts guardian-only families hidden by default toggle', () => {
    expect(countHiddenGuardianOnlyFamilies([withChildren, withoutChildren], {}, '')).toBe(1);
  });

  it('returns zero when search reveals guardian-only families', () => {
    expect(countHiddenGuardianOnlyFamilies([withChildren, withoutChildren], {}, 'بدون')).toBe(0);
  });
});
