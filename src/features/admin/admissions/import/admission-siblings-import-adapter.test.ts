import { describe, expect, it } from 'vitest';
import {
  inferHasSiblingsFromText,
  mapAdmissionImportSiblingsFields,
  parseSiblingLineFromText,
  parseSiblingLinesFromText,
} from './admission-siblings-import-adapter';

describe('parseSiblingLineFromText', () => {
  it('parses brother with level from Arabic text', () => {
    const line = parseSiblingLineFromText('أخ في الخامس');
    expect(line).toEqual({
      relationship: 'brother',
      level_text: '5AEP',
      is_current_student: false,
    });
  });

  it('parses sister age without inventing a name', () => {
    const line = parseSiblingLineFromText('أخت 8 سنوات');
    expect(line).toEqual({
      relationship: 'sister',
      age_years_at_admission: 8,
      is_current_student: false,
    });
  });

  it('returns null for unclear text', () => {
    expect(parseSiblingLineFromText('ملاحظة عامة')).toBeNull();
  });
});

describe('parseSiblingLinesFromText', () => {
  it('parses multiple segments separated by newline', () => {
    const lines = parseSiblingLinesFromText('أخ في الخامس\nأخت 8 سنوات');
    expect(lines).toHaveLength(2);
    expect(lines[0].relationship).toBe('brother');
    expect(lines[1].age_years_at_admission).toBe(8);
  });
});

describe('mapAdmissionImportSiblingsFields', () => {
  it('maps has_siblings and copies siblings_levels to raw text', () => {
    const payload = mapAdmissionImportSiblingsFields({
      has_siblings: true,
      siblings_levels: 'أخ في الخامس',
    });
    expect(payload.has_siblings).toBe(true);
    expect(payload.siblings_levels).toBe('أخ في الخامس');
    expect(payload.siblings_raw_text).toBe('أخ في الخامس');
    expect(payload.sibling_lines?.[0]?.relationship).toBe('brother');
  });

  it('infers has_siblings from free text when flag missing', () => {
    const payload = mapAdmissionImportSiblingsFields({
      siblings_levels: 'أخت 8 سنوات',
    });
    expect(payload.has_siblings).toBe(true);
    expect(payload.siblings_raw_text).toBe('أخت 8 سنوات');
  });

  it('does not set linked_student_id or invent names', () => {
    const payload = mapAdmissionImportSiblingsFields({
      siblings_levels: 'أخت 8 سنوات',
    });
    for (const line of payload.sibling_lines ?? []) {
      expect(line.linked_student_id).toBeUndefined();
      expect(line.name).toBeUndefined();
    }
  });
});

describe('inferHasSiblingsFromText', () => {
  it('detects sibling hints in Arabic', () => {
    expect(inferHasSiblingsFromText('أخ في الخامس')).toBe(true);
    expect(inferHasSiblingsFromText('لا يوجد')).toBe(false);
  });
});
