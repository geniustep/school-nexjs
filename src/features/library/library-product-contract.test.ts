import { describe, expect, it } from 'vitest';
import { libraryCoverBffUrl, normalizeLibraryImportHeaders } from './library-product-contract';

describe('library product contract helpers', () => {
  it('keeps authenticated library covers behind the Next.js BFF', () => {
    expect(libraryCoverBffUrl('/api/v1/student/library/titles/4/cover')).toBe('/api/odoo/student/library/titles/4/cover');
    expect(libraryCoverBffUrl(null)).toBeNull();
  });

  it('normalizes Arabic Excel headers without inventing copy data', () => {
    expect(normalizeLibraryImportHeaders({
      'العنوان': 'الرياضيات',
      'المؤلف': 'فريق التأليف',
      'ISBN': '9780000000001',
      'رقم الجرد': 'LIB-001',
      'الرف': 'A-2',
    })).toMatchObject({
      name: 'الرياضيات',
      author_names: 'فريق التأليف',
      isbn: '9780000000001',
      accession_code: 'LIB-001',
      shelf_location: 'A-2',
    });
  });
});
