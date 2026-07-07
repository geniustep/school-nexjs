import { isDocumentActive } from './student-document-display';
import type { StudentDocument, StudentDocumentTypeOption } from '@/types/student-360';

export const STUDENT_PHOTO_DOCUMENT_CODE = 'student_photo';

export function isStudentPhotoDocumentType(
  documentType: StudentDocumentTypeOption | string | null | undefined,
): boolean {
  if (!documentType) return false;
  if (typeof documentType === 'string') return documentType === STUDENT_PHOTO_DOCUMENT_CODE;
  return documentType.code === STUDENT_PHOTO_DOCUMENT_CODE;
}

export function findStudentPhotoDocument(documents: StudentDocument[]): StudentDocument | null {
  const matches = documents.filter(
    (doc) => isStudentPhotoDocumentType(doc.document_type) && isDocumentActive(doc),
  );
  if (!matches.length) return null;
  return matches.sort((a, b) => b.id - a.id)[0] ?? null;
}

export function findStudentPhotoDocumentType(
  documentTypes: StudentDocumentTypeOption[],
): StudentDocumentTypeOption | null {
  return documentTypes.find((type) => type.code === STUDENT_PHOTO_DOCUMENT_CODE) ?? null;
}
