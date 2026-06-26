import { describe, expect, it } from 'vitest';
import {
  __testResolveActiveChildren,
  normalizeParentListItem,
  normalizeParentProfile,
} from './normalize-parent-profile';
import { isActiveGuardianRelationship } from './parent-relationships-normalize';

describe('normalizeParentProfile relationships', () => {
  it('ignores legacy student_ids when relationships is empty (unified contract)', () => {
    const raw = {
      id: 281,
      name: 'Test',
      relationships: [],
      student_ids: [727],
      children: [{ id: 727, name: 'C 3' }],
    };

    const active = __testResolveActiveChildren(raw);
    expect(active).toEqual([]);

    const parent = normalizeParentProfile(raw);
    expect(parent?.relationships).toEqual([]);
    expect(parent?.children).toEqual([]);
  });

  it('uses legacy fallback when relationships key is absent', () => {
    const raw = {
      id: 275,
      name: 'Legacy Parent',
      children: [{ id: 727, name: 'Student' }],
    };

    const active = __testResolveActiveChildren(raw);
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe(727);

    const parent = normalizeParentProfile(raw);
    expect(parent?.children).toHaveLength(1);
  });

  it('excludes ended relationships from active list', () => {
    const raw = {
      id: 281,
      person: { display_name: 'Parent' },
      relationships: [
        {
          relationship_id: 99,
          student_id: 727,
          student_name: 'C 3',
          student_code: 'OTHER1781394140776',
          relationship_type: 'mother',
          state: 'ended',
          active: true,
        },
      ],
    };

    const active = __testResolveActiveChildren(raw);
    expect(active).toEqual([]);

    const parent = normalizeParentProfile(raw);
    expect(parent?.relationships).toEqual([]);
  });

  it('uses legacy children on list rows when relationships is empty', () => {
    const parent = normalizeParentListItem({
      id: 275,
      name: 'Legacy Parent',
      relationships: [],
      children: [{ id: 727, name: 'Student' }],
    });

    expect(parent?.children).toHaveLength(1);
    expect(parent?.children?.[0]?.id).toBe(727);
  });
});

describe('isActiveGuardianRelationship', () => {
  it('returns false for ended state even when active flag is true', () => {
    expect(
      isActiveGuardianRelationship({
        relationship_id: 99,
        state: 'ended',
        active: true,
      }),
    ).toBe(false);
  });

  it('returns false when ended_at is set', () => {
    expect(
      isActiveGuardianRelationship({
        relationship_id: 1,
        state: 'active',
        active: true,
        ended_at: '2024-01-01',
      }),
    ).toBe(false);
  });
});
