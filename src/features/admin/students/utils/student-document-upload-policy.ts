export const STUDENT_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

export type StudentDocumentUploadRejectReason =
  | 'document_file_required'
  | 'document_file_too_large'
  | 'document_file_type_not_allowed';

export interface StudentDocumentUploadValidationResult {
  ok: boolean;
  reason?: StudentDocumentUploadRejectReason;
  fileName?: string;
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return '';
  return name.slice(dot).toLowerCase();
}

export function isAllowedStudentDocumentFile(file: File): boolean {
  const ext = fileExtension(file.name);
  if (ext && ALLOWED_EXT.has(ext)) return true;
  const mime = (file.type ?? '').toLowerCase();
  return ALLOWED_MIME.has(mime);
}

export function validateStudentDocumentFile(
  file: File | null | undefined,
): StudentDocumentUploadValidationResult {
  if (!file) {
    return { ok: false, reason: 'document_file_required' };
  }
  if (file.size > STUDENT_DOCUMENT_MAX_BYTES) {
    return { ok: false, reason: 'document_file_too_large', fileName: file.name };
  }
  if (!isAllowedStudentDocumentFile(file)) {
    return { ok: false, reason: 'document_file_type_not_allowed', fileName: file.name };
  }
  return { ok: true };
}

export function studentDocumentUploadErrorKey(
  reason: StudentDocumentUploadRejectReason,
): 'fileRequired' | 'fileTooLarge' | 'fileTypeNotAllowed' {
  switch (reason) {
    case 'document_file_required':
      return 'fileRequired';
    case 'document_file_too_large':
      return 'fileTooLarge';
    case 'document_file_type_not_allowed':
      return 'fileTypeNotAllowed';
  }
}

export function validateDocumentDates(
  issueDate: string,
  expiryDate: string,
): 'invalid_document_dates' | null {
  if (!issueDate || !expiryDate) return null;
  const issue = issueDate.split('-').map(Number);
  const expiry = expiryDate.split('-').map(Number);
  if (issue.length !== 3 || expiry.length !== 3) return null;
  const issueTs = new Date(issue[0], issue[1] - 1, issue[2]).getTime();
  const expiryTs = new Date(expiry[0], expiry[1] - 1, expiry[2]).getTime();
  if (expiryTs < issueTs) return 'invalid_document_dates';
  return null;
}

export function buildStudentDocumentCreateFormData(
  fields: {
    documentTypeId?: string;
    documentTypeCode?: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    notes?: string;
  },
  file: File,
): FormData {
  const fd = new FormData();
  fd.append('file', file);
  if (fields.documentTypeId) {
    fd.append('document_type_id', fields.documentTypeId);
  } else if (fields.documentTypeCode) {
    fd.append('document_type', fields.documentTypeCode);
  }
  if (fields.documentNumber?.trim()) fd.append('document_number', fields.documentNumber.trim());
  if (fields.issueDate) fd.append('issue_date', fields.issueDate);
  if (fields.expiryDate) fd.append('expiry_date', fields.expiryDate);
  if (fields.notes?.trim()) fd.append('notes', fields.notes.trim());
  return fd;
}

export function buildStudentDocumentReplaceFormData(file: File): FormData {
  const fd = new FormData();
  fd.append('file', file);
  return fd;
}
