import { describe, expect, it } from 'vitest';
import { mapAdmissionImportRow } from './admission-import-row-adapter';

describe('mapAdmissionImportRow', () => {
  it('maps siblings_levels into raw text and structured lines', () => {
    const payload = mapAdmissionImportRow({
      has_siblings: 'yes',
      siblings_levels: 'أخ في الخامس',
      external_reference: 'REF-001',
    });
    expect(payload.external_reference).toBe('REF-001');
    expect(payload.has_siblings).toBe(true);
    expect(payload.siblings_raw_text).toBe('أخ في الخامس');
    expect(payload.sibling_lines).toEqual([
      expect.objectContaining({ relationship: 'brother', level_text: '5AEP' }),
    ]);
  });
});
