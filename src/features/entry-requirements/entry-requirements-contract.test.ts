import { describe, expect, it } from 'vitest';
import { familyRequirementItems, requirementItemTypeLabel, requirementProgressLabel, type ParentRequirementChild } from './entry-requirements-contract';

const child = {
  books: [{ stable_key: 'book-1', item_type: 'textbook', name: 'كتاب الرياضيات' }],
  notebooks: [{ stable_key: 'note-1', item_type: 'notebook', name: 'دفتر' }],
  stationery: [], uniform: [], materials: [], other: [],
} as unknown as ParentRequirementChild;

describe('entry requirement presentation helpers', () => {
  it('keeps child items identifiable when building the family view', () => {
    expect(familyRequirementItems(child).map((item) => item.stable_key)).toEqual(['book-1', 'note-1']);
  });

  it('uses parent-friendly Arabic labels', () => {
    expect(requirementItemTypeLabel('textbook')).toBe('كتاب مقرر');
    expect(requirementProgressLabel('already_have')).toBe('لدي بالفعل');
    expect(requirementProgressLabel('purchased')).toBe('تم الشراء');
  });
});
