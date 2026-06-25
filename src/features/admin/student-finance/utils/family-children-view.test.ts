import { describe, expect, it } from 'vitest';
import { resolveFamilyChildrenView } from './family-children-view';
import type { FamilyFinanceChild } from '@/types/family-finance';

function child(id: number): FamilyFinanceChild {
  return {
    student_id: id,
    student_name: `Student ${id}`,
    services_summary: [],
  } as FamilyFinanceChild;
}

describe('resolveFamilyChildrenView', () => {
  it('flags only-current when the table holds just the current student', () => {
    const view = resolveFamilyChildrenView([child(5)], 5);

    expect(view.total).toBe(1);
    expect(view.otherCount).toBe(0);
    expect(view.hasOtherSiblings).toBe(false);
    expect(view.showOnlyCurrentNote).toBe(true);
  });

  it('detects real siblings when other students share the account', () => {
    const view = resolveFamilyChildrenView([child(5), child(7), child(9)], 5);

    expect(view.total).toBe(3);
    expect(view.otherCount).toBe(2);
    expect(view.hasOtherSiblings).toBe(true);
    expect(view.showOnlyCurrentNote).toBe(false);
  });

  it('does not show the only-current note when there are no children', () => {
    const view = resolveFamilyChildrenView([], 5);

    expect(view.total).toBe(0);
    expect(view.showOnlyCurrentNote).toBe(false);
    expect(view.hasOtherSiblings).toBe(false);
  });
});
