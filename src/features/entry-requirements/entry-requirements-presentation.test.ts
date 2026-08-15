import { describe, expect, it } from 'vitest';

import type { RequirementItem } from './entry-requirements-contract';
import {
  groupRequirementItems,
  aggregateRequirementCovers,
  notebookCoverTone,
  notebookPageCount,
  notebookPresentation,
  requirementCoverAllocations,
  requirementCoverColor,
  withRequirementCoverAllocations,
} from './entry-requirements-presentation';

function item(partial: Partial<RequirementItem>): RequirementItem {
  return {
    id: partial.id ?? 1,
    stable_key: partial.stable_key ?? `item-${partial.id ?? 1}`,
    sequence: partial.sequence ?? 10,
    item_type: partial.item_type ?? 'stationery',
    name: partial.name ?? 'عنصر',
    title: partial.title ?? null,
    quantity: partial.quantity ?? 1,
    subject_id: partial.subject_id ?? null,
    subject: partial.subject ?? null,
    importance: partial.importance ?? 'required',
    provision_source: partial.provision_source ?? 'family',
    provided_by_school: partial.provided_by_school ?? false,
    reusable_allowed: partial.reusable_allowed ?? null,
    reusable: partial.reusable ?? false,
    notes: partial.notes ?? null,
    needs_resolution: partial.needs_resolution ?? false,
    publisher: partial.publisher ?? null,
    edition: partial.edition ?? null,
    isbn: partial.isbn ?? null,
    teaching_offering_id: partial.teaching_offering_id ?? null,
    teaching_reference_id: partial.teaching_reference_id ?? null,
  };
}

describe('entry requirement catalog presentation', () => {
  it('groups books first, notebooks second, and all remaining tools together while preserving sequence', () => {
    const groups = groupRequirementItems([
      item({ id: 4, sequence: 40, item_type: 'material', name: 'صلصال' }),
      item({ id: 2, sequence: 20, item_type: 'notebook', name: 'دفتر 96 صفحة' }),
      item({ id: 1, sequence: 10, item_type: 'textbook', name: 'كتابي في اللغة العربية' }),
      item({ id: 3, sequence: 30, item_type: 'uniform', name: 'مئزر' }),
      item({ id: 5, sequence: 15, item_type: 'book', name: 'قاموس' }),
    ]);

    expect(groups.books.map((row) => row.id)).toEqual([1, 5]);
    expect(groups.notebooks.map((row) => row.id)).toEqual([2]);
    expect(groups.tools.map((row) => row.id)).toEqual([3, 4]);
  });

  it('extracts page count only when it is explicitly present in item text', () => {
    expect(notebookPageCount(item({ item_type: 'notebook', name: 'دفتر من فئة 96 صفحة' }))).toBe('96');
    expect(notebookPageCount(item({ item_type: 'notebook', name: 'دفتر', notes: '200 pages' }))).toBe('200');
    expect(notebookPageCount(item({ item_type: 'notebook', name: 'دفتر كبير' }))).toBeNull();
  });

  it('reads explicit notebook cover and purpose labels from notes', () => {
    expect(notebookPresentation(item({
      item_type: 'notebook',
      name: 'دفتر من فئة 48 صفحة',
      notes: 'الغلاف: وردي\nالغرض: التعبير الكتابي',
    }))).toEqual({
      pages: '48',
      cover: 'وردي',
      purpose: 'التعبير الكتابي',
      coverTone: 'pink',
    });
  });

  it('supports Arabic and French/English cover colors while keeping unknown covers neutral', () => {
    expect(notebookCoverTone('أزرق')).toBe('blue');
    expect(notebookCoverTone('Jaune')).toBe('yellow');
    expect(notebookCoverTone('Green')).toBe('green');
    expect(notebookCoverTone('مزخرف')).toBe('neutral');
    expect(notebookCoverTone(null)).toBe('neutral');
  });

  it('adds, replaces, and removes distributed covers without losing other notes', () => {
    const book = item({ item_type: 'textbook', notes: 'ملاحظة مهمة\nالغلاف: أحمر\nالغرض: القراءة' });
    expect(requirementCoverColor(book)).toBe('أحمر');
    expect(withRequirementCoverAllocations(book.notes, [
      { color: 'أزرق', quantity: 1 },
      { color: 'أخضر', quantity: 2 },
    ])).toBe('ملاحظة مهمة\nالغرض: القراءة\nأغلفة: أزرق ×1، أخضر ×2');
    expect(withRequirementCoverAllocations(book.notes, [])).toBe('ملاحظة مهمة\nالغرض: القراءة');
  });

  it('reads legacy one-color covers and new color distributions', () => {
    expect(requirementCoverAllocations(item({
      item_type: 'notebook', quantity: 3, notes: 'غلاف: أحمر',
    }))).toEqual([{ color: 'أحمر', quantity: 3 }]);
    expect(requirementCoverAllocations(item({
      item_type: 'notebook', quantity: 3, notes: 'أغلفة: أحمر ×1، أزرق ×1، أخضر ×1',
    }))).toEqual([
      { color: 'أحمر', quantity: 1 },
      { color: 'أزرق', quantity: 1 },
      { color: 'أخضر', quantity: 1 },
    ]);
  });

  it('aggregates linked covers by color using the parent item quantity', () => {
    expect(aggregateRequirementCovers([
      item({ id: 1, item_type: 'textbook', quantity: 2, notes: 'غلاف: أحمر' }),
      item({ id: 2, item_type: 'notebook', quantity: 3, notes: 'الغلاف: أحمر' }),
      item({ id: 3, item_type: 'book', quantity: 1, notes: 'غلاف: أزرق' }),
      item({ id: 5, item_type: 'notebook', quantity: 3, notes: 'أغلفة: أحمر ×1، أخضر ×2' }),
      item({ id: 4, item_type: 'stationery', quantity: 20, notes: 'غلاف: أحمر' }),
    ])).toEqual([
      { color: 'أحمر', quantity: 6 },
      { color: 'أخضر', quantity: 2 },
      { color: 'أزرق', quantity: 1 },
    ]);
  });
});
