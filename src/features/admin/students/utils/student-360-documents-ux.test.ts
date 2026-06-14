import { describe, expect, it } from 'vitest';
import {
  missingRequiredDocumentTypes,
  normalizeStudentDocumentsResponse,
} from './normalize-student-documents';
import { validateStudentDocumentFile } from './student-document-upload-policy';

describe('missingRequiredDocumentTypes', () => {
  const types = [
    { id: 1, code: 'birth_cert', name: 'Birth certificate', is_required: true },
    { id: 2, code: 'insurance', name: 'Insurance', is_required: true },
    { id: 3, code: 'photo', name: 'Photo', is_required: false },
  ];

  it('returns required types not present in active documents', () => {
    const items = normalizeStudentDocumentsResponse({
      items: [
        {
          id: 10,
          state: 'valid',
          active: true,
          document_type: { id: 1, code: 'birth_cert', name: 'Birth certificate', is_required: true },
        },
      ],
      summary: {},
      capabilities: {},
    })!.items;

    const missing = missingRequiredDocumentTypes(types, items);
    expect(missing).toHaveLength(1);
    expect(missing[0].code).toBe('insurance');
  });

  it('ignores archived documents', () => {
    const items = normalizeStudentDocumentsResponse({
      items: [
        {
          id: 10,
          state: 'archived',
          active: false,
          document_type: { id: 1, code: 'birth_cert', name: 'Birth certificate', is_required: true },
        },
      ],
      summary: {},
      capabilities: {},
    })!.items;

    expect(missingRequiredDocumentTypes(types, items).map((t) => t.code)).toEqual([
      'birth_cert',
      'insurance',
    ]);
  });
});

describe('normalizeStudentDocumentsResponse items null', () => {
  it('treats null items as empty array', () => {
    const data = normalizeStudentDocumentsResponse({
      items: null,
      summary: { total: 0, valid: 0, expired: 0, missing_required: 2 },
      capabilities: { can_view: true, can_manage: true },
    });
    expect(data?.items).toEqual([]);
    expect(data?.summary.missing_required).toBe(2);
  });
});

describe('student document file validation', () => {
  it('rejects disallowed file type', () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'size', { value: 100 });
    const result = validateStudentDocumentFile(file);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('document_file_type_not_allowed');
  });

  it('rejects file over 10 MB', () => {
    const file = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
    const result = validateStudentDocumentFile(file);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('document_file_too_large');
  });

  it('accepts valid PNG file', () => {
    const file = new File(['x'], 'scan.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 2048 });
    expect(validateStudentDocumentFile(file).ok).toBe(true);
  });
});
