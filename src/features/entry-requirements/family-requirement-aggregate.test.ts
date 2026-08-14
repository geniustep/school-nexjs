import { describe, expect, it } from 'vitest';
import {
  familyRequirementAggregateKey,
  buildFamilyRequirementAggregate,
} from './family-requirement-aggregate';
import type {
  ParentRequirementFamily,
  RequirementItem,
} from './entry-requirements-contract';

function item(overrides: Partial<RequirementItem> = {}): RequirementItem {
  return {
    id: 1,
    stable_key: 'item-1',
    sequence: 1,
    item_type: 'textbook',
    name: 'كتاب الرياضيات',
    quantity: 1,
    subject_id: 1,
    subject: 'الرياضيات',
    importance: 'required',
    provision_source: 'family',
    provided_by_school: false,
    reusable_allowed: null,
    reusable: false,
    notes: null,
    needs_resolution: false,
    ...overrides,
  };
}

describe('family requirement purchase aggregation', () => {
  it('keeps different ISBN editions separate even when visible names match', () => {
    expect(familyRequirementAggregateKey(item({ isbn: '978-1-1111' }))).not.toBe(
      familyRequirementAggregateKey(item({ isbn: '978-2-2222' })),
    );
  });

  it('normalizes formatting differences in the same ISBN', () => {
    expect(familyRequirementAggregateKey(item({ isbn: '978-1 1111' }))).toBe(
      familyRequirementAggregateKey(item({ isbn: '97811111' })),
    );
  });

  it('uses the canonical teaching reference before visible labels', () => {
    expect(
      familyRequirementAggregateKey(
        item({ teaching_reference_id: 44, name: 'عنوان أول', isbn: null }),
      ),
    ).toBe(
      familyRequirementAggregateKey(
        item({ teaching_reference_id: 44, name: 'عنوان ثان', isbn: null }),
      ),
    );
  });

  it('aggregates the same physical requirement across children', () => {
    const first = item({ id: 1, stable_key: 'a', isbn: '9780001', quantity: 1 });
    const second = item({ id: 2, stable_key: 'b', isbn: '9780001', quantity: 2 });
    const family = {
      children: [
        {
          student: { id: 1, name: 'سلمى' },
          books: [first],
          notebooks: [],
          stationery: [],
          uniform: [],
          materials: [],
          other: [],
          progress: [],
        },
        {
          student: { id: 2, name: 'ياسين' },
          books: [second],
          notebooks: [],
          stationery: [],
          uniform: [],
          materials: [],
          other: [],
          progress: [],
        },
      ],
    } as unknown as ParentRequirementFamily;

    expect(buildFamilyRequirementAggregate(family)).toMatchObject([
      {
        quantity: 3,
        children: [
          { name: 'سلمى', quantity: 1 },
          { name: 'ياسين', quantity: 2 },
        ],
      },
    ]);
  });
});
