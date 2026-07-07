import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/types/api';
import type { StudentDocument, StudentDocumentTypeOption } from '@/types/student-360';
import {
  buildStudentDocumentCreateFormData,
  buildStudentDocumentReplaceFormData,
  validateStudentDocumentFile,
  type StudentDocumentUploadRejectReason,
} from './student-document-upload-policy';
import {
  findStudentPhotoDocument,
  findStudentPhotoDocumentType,
  STUDENT_PHOTO_DOCUMENT_CODE,
} from './student-photo-document';

const PHOTO_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PHOTO_ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export type StudentPhotoUploadRejectReason =
  | StudentDocumentUploadRejectReason
  | 'photo_file_type_not_allowed';

export function isAllowedStudentPhotoFile(file: File): boolean {
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
  if (ext && PHOTO_ALLOWED_EXT.has(ext)) return true;
  const mime = (file.type ?? '').toLowerCase();
  return PHOTO_ALLOWED_MIME.has(mime);
}

export function validateStudentPhotoFile(file: File | null | undefined): {
  ok: boolean;
  reason?: StudentPhotoUploadRejectReason;
  fileName?: string;
} {
  const base = validateStudentDocumentFile(file);
  if (!base.ok) return base;
  if (!isAllowedStudentPhotoFile(file!)) {
    return { ok: false, reason: 'photo_file_type_not_allowed', fileName: file!.name };
  }
  return { ok: true };
}

export function studentPhotoUploadErrorKey(
  reason: StudentPhotoUploadRejectReason,
): 'fileRequired' | 'fileTooLarge' | 'fileTypeNotAllowed' | 'photoFileTypeNotAllowed' {
  if (reason === 'photo_file_type_not_allowed') return 'photoFileTypeNotAllowed';
  if (reason === 'document_file_required') return 'fileRequired';
  if (reason === 'document_file_too_large') return 'fileTooLarge';
  return 'fileTypeNotAllowed';
}

export async function uploadStudentPhotoDocument(options: {
  studentId: number;
  file: File;
  documents: StudentDocument[];
  documentTypes: StudentDocumentTypeOption[];
  activeSchoolId?: number | null;
}): Promise<ApiResponse<unknown>> {
  const query =
    options.activeSchoolId != null ? { active_school_id: options.activeSchoolId } : undefined;
  const existing = findStudentPhotoDocument(options.documents);

  if (existing) {
    return api.uploadForm<unknown>(
      endpoints.admin.studentDocumentReplace(options.studentId, existing.id),
      buildStudentDocumentReplaceFormData(options.file),
      query,
    );
  }

  const photoType = findStudentPhotoDocumentType(options.documentTypes);
  const fd = buildStudentDocumentCreateFormData(
    {
      documentTypeId: photoType ? String(photoType.id) : undefined,
      documentTypeCode: photoType?.code ?? STUDENT_PHOTO_DOCUMENT_CODE,
    },
    options.file,
  );

  return api.uploadForm<unknown>(endpoints.admin.studentDocuments(options.studentId), fd, query);
}
