import { describe, expect, it } from 'vitest';
import { normalizeStudentDocumentsResponse } from './normalize-student-documents';
import {
  buildStudentDocumentCreateFormData,
  validateDocumentDates,
  validateStudentDocumentFile,
} from './student-document-upload-policy';
import {
  buildStudentHealthCreatePayload,
  buildStudentHealthPartialUpdatePayload,
  defaultStudentHealthFormState,
  validateStudentHealthForm,
} from './student-health-profile';
import {
  canManageStudentDocuments,
  canViewStudentDocuments,
  canViewStudentHealth,
  resolveStudentCapabilities,
} from './resolve-capabilities';
import { documentAttachmentToMeta } from './student-document-display';

describe('normalizeStudentDocumentsResponse', () => {
  it('parses items, summary, and capabilities', () => {
    const data = normalizeStudentDocumentsResponse({
      items: [
        {
          id: 6,
          document_type: { id: 1, code: 'insurance_document', name: 'Insurance' },
          state: 'uploaded',
          attachment: { id: 100, name: 'doc.pdf', mimetype: 'application/pdf', size: 12345 },
        },
      ],
      summary: { total: 1, valid: 0, expired: 0, missing_required: 0 },
      capabilities: { can_view: true, can_manage: true },
    });
    expect(data?.items).toHaveLength(1);
    expect(data?.items[0].attachment?.id).toBe(100);
    expect(data?.summary.total).toBe(1);
    expect(data?.capabilities.can_manage).toBe(true);
  });

  it('keeps document id separate from attachment id', () => {
    const data = normalizeStudentDocumentsResponse({
      items: [{ id: 6, state: 'valid', attachment: { id: 100, name: 'a.pdf' } }],
      summary: {},
      capabilities: {},
    });
    expect(data?.items[0].id).toBe(6);
    expect(data?.items[0].attachment?.id).toBe(100);
  });
});

describe('student document upload policy', () => {
  it('rejects expiry before issue date', () => {
    expect(validateDocumentDates('2026-01-15', '2026-01-01')).toBe('invalid_document_dates');
  });

  it('allows valid PDF file metadata', () => {
    const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 });
    expect(validateStudentDocumentFile(file).ok).toBe(true);
  });

  it('builds multipart form with document_type_id and file', () => {
    const file = new File(['x'], 'x.pdf', { type: 'application/pdf' });
    const fd = buildStudentDocumentCreateFormData(
      { documentTypeId: '3', documentNumber: 'N1' },
      file,
    );
    expect(fd.get('document_type_id')).toBe('3');
    expect(fd.get('document_number')).toBe('N1');
    expect(fd.get('file')).toBe(file);
  });
});

describe('documentAttachmentToMeta', () => {
  it('maps attachment for preview/download by attachment id', () => {
    const meta = documentAttachmentToMeta({
      id: 100,
      name: 'scan.png',
      mimetype: 'image/png',
      size: 500,
    });
    expect(meta.id).toBe(100);
    expect(meta.is_image).toBe(true);
    expect(meta.is_previewable).toBe(true);
  });
});

describe('student health profile', () => {
  const t = (k: string) => k;

  it('builds partial update with changed tri-state field only', () => {
    const original = { ...defaultStudentHealthFormState(), hasAllergies: false };
    const current = { ...original, hasAllergies: true, allergiesDescription: 'QA pollen' };
    const payload = buildStudentHealthPartialUpdatePayload(current, original);
    expect(payload.has_allergies).toBe(true);
    expect(payload.allergies_description).toBe('QA pollen');
    expect(payload.blood_type).toBeUndefined();
  });

  it('builds create payload from form state', () => {
    const state = { ...defaultStudentHealthFormState(), bloodType: 'A+' };
    expect(buildStudentHealthCreatePayload(state).blood_type).toBe('A+');
  });

  it('rejects invalid blood type when options provided', () => {
    const state = { ...defaultStudentHealthFormState(), bloodType: 'INVALID' };
    const result = validateStudentHealthForm(state, ['O+', 'A+'], t);
    expect(result.valid).toBe(false);
  });

  it('rejects yes without description', () => {
    const state = { ...defaultStudentHealthFormState(), hasAllergies: true };
    const result = validateStudentHealthForm(state, ['O+'], t);
    expect(result.valid).toBe(false);
  });
});

describe('resolveStudentCapabilities', () => {
  it('uses API document and health caps without inferring from can_manage', () => {
    const caps = resolveStudentCapabilities(
      {
        can_manage: true,
        can_manage_guardians: true,
        can_view_finance: false,
        can_view_documents: true,
        can_manage_documents: false,
        can_view_health: false,
        can_manage_health: false,
      },
      null,
    );
    expect(canViewStudentDocuments(caps)).toBe(true);
    expect(canManageStudentDocuments(caps)).toBe(false);
    expect(canViewStudentHealth(caps)).toBe(false);
  });
});
