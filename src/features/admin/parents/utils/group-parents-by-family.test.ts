import { describe, expect, it } from 'vitest';
import { groupParentsByFamily } from '@/features/admin/parents/utils/group-parents-by-family';
import { normalizeParentListItem } from '@/features/admin/parents/utils/normalize-parent-profile';
import type { Parent } from '@/types/parent';

function makeParent(
  id: number,
  name: string,
  children: Array<{ id: number; name: string; relationship_type?: string }>,
  relation: string | null = null,
  school?: { id: number; name: string },
): Parent {
  return {
    id,
    name,
    school: school ?? null,
    phone: null,
    email: null,
    relation,
    status: 'active',
    children: children.map((child) => ({
      id: child.id,
      name: child.name,
      school: school ?? null,
      relationship: child.relationship_type
        ? { relationship_type: child.relationship_type, relationship_id: child.id * 100 + id }
        : null,
    })),
  };
}

describe('groupParentsByFamily', () => {
  it('groups guardians who share children into one family', () => {
    const parents = [
      makeParent(1, 'محمد الطالبي', [{ id: 10, name: 'ياسر الطالبي', relationship_type: 'father' }], 'father'),
      makeParent(2, 'هيام أحمد', [{ id: 10, name: 'ياسر الطالبي', relationship_type: 'mother' }], 'mother'),
      makeParent(3, 'رشيد الطالبي', [{ id: 10, name: 'ياسر الطالبي', relationship_type: 'grandfather' }], 'grandfather'),
    ];

    const families = groupParentsByFamily(parents);

    expect(families).toHaveLength(1);
    expect(families[0].children.map((c) => c.name)).toEqual(['ياسر الطالبي']);
    expect(families[0].guardians.map((g) => g.parent.name)).toEqual([
      'محمد الطالبي',
      'هيام أحمد',
      'رشيد الطالبي',
    ]);
    expect(families[0].guardians.map((g) => g.relationshipType)).toEqual([
      'father',
      'mother',
      'grandfather',
    ]);
  });

  it('merges siblings under the same family', () => {
    const parents = [
      makeParent(
        1,
        'محمد الطالبي',
        [
          { id: 10, name: 'ياسر الطالبي', relationship_type: 'father' },
          { id: 11, name: 'يسرى الطالبي', relationship_type: 'father' },
        ],
        'father',
      ),
      makeParent(
        2,
        'هيام أحمد',
        [
          { id: 10, name: 'ياسر الطالبي', relationship_type: 'mother' },
          { id: 11, name: 'يسرى الطالبي', relationship_type: 'mother' },
        ],
        'mother',
      ),
    ];

    const families = groupParentsByFamily(parents);

    expect(families).toHaveLength(1);
    expect(families[0].children.map((c) => c.name)).toEqual(['ياسر الطالبي', 'يسرى الطالبي']);
  });

  it('keeps unrelated guardians in separate families', () => {
    const parents = [
      makeParent(1, 'Parent A', [{ id: 10, name: 'Child A', relationship_type: 'father' }]),
      makeParent(2, 'Parent B', [{ id: 20, name: 'Child B', relationship_type: 'father' }]),
    ];

    const families = groupParentsByFamily(parents);

    expect(families).toHaveLength(2);
  });

  it('never merges matching child identities across schools', () => {
    const schoolA = { id: 101, name: 'School A' };
    const schoolB = { id: 202, name: 'School B' };
    const parents = [
      makeParent(1, 'Parent A', [{ id: 10, name: 'Same Child', relationship_type: 'father' }], 'father', schoolA),
      makeParent(2, 'Parent B', [{ id: 10, name: 'Same Child', relationship_type: 'mother' }], 'mother', schoolB),
    ];

    const families = groupParentsByFamily(parents);

    expect(families).toHaveLength(2);
    expect(families.map((family) => family.school?.id).sort()).toEqual([101, 202]);
    expect(families.every((family) => family.guardians.length === 1)).toBe(true);
  });

  it('deduplicates repeated parent rows from the API', () => {
    const parent = makeParent(1, 'Parent A', [{ id: 10, name: 'Child A', relationship_type: 'father' }]);
    const families = groupParentsByFamily([parent, parent]);

    expect(families).toHaveLength(1);
    expect(families[0].guardians).toHaveLength(1);
  });

  it('groups list rows with empty relationships but legacy children', () => {
    const father = normalizeParentListItem({
      id: 1,
      name: 'محمد الطالبي',
      relation: 'father',
      relationships: [],
      children: [{ id: 10, name: 'ياسر الطالبي' }, { id: 11, name: 'يسرى الطالبي' }],
    });
    const mother = normalizeParentListItem({
      id: 2,
      name: 'هيام أحمد',
      relation: 'mother',
      relationships: [],
      children: [{ id: 10, name: 'ياسر الطالبي' }, { id: 11, name: 'يسرى الطالبي' }],
    });
    const grandfather = normalizeParentListItem({
      id: 3,
      name: 'رشيد الطالبي',
      relation: 'grandfather',
      relationships: [],
      children: [{ id: 10, name: 'ياسر الطالبي' }],
    });

    expect(father).not.toBeNull();
    expect(mother).not.toBeNull();
    expect(grandfather).not.toBeNull();

    const families = groupParentsByFamily([father!, mother!, grandfather!]);

    expect(families).toHaveLength(1);
    expect(families[0].children.map((c) => c.name)).toEqual(['ياسر الطالبي', 'يسرى الطالبي']);
    expect(families[0].guardians.map((g) => [g.relationshipType, g.parent.name])).toEqual([
      ['father', 'محمد الطالبي'],
      ['mother', 'هيام أحمد'],
      ['grandfather', 'رشيد الطالبي'],
    ]);
  });
});
