import { describe, expect, it } from 'vitest';
import { resolveDocumentTypeLabel } from './document-type-labels';

const t = (key: string) => {
  const map: Record<string, string> = {
    'admin.student360.documents.types.birthCertificate': 'شهادة الميلاد',
    'admin.student360.documents.types.guardianIdCopy': 'نسخة من بطاقة هوية ولي الأمر',
  };
  return map[key] ?? key;
};

describe('resolveDocumentTypeLabel', () => {
  it('translates known document type codes', () => {
    expect(
      resolveDocumentTypeLabel({ id: 1, code: 'birth_certificate', name: 'Birth Certificate' }, t),
    ).toBe('شهادة الميلاد');
    expect(
      resolveDocumentTypeLabel({ id: 2, code: 'guardian_id_copy', name: 'Guardian ID Copy' }, t),
    ).toBe('نسخة من بطاقة هوية ولي الأمر');
  });

  it('falls back to API name when no i18n key exists', () => {
    expect(
      resolveDocumentTypeLabel({ id: 3, code: 'custom_doc', name: 'Custom Doc' }, t),
    ).toBe('Custom Doc');
  });
});
