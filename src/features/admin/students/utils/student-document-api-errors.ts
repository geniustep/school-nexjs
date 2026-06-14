import type { ApiErrorBody } from '@/types/api';

export interface StudentDocumentFieldErrors {
  documentType?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  file?: string;
  general?: string;
}

export function mapStudentDocumentApiError(
  error: ApiErrorBody,
  t: (key: string) => string,
): StudentDocumentFieldErrors {
  const code = error.code;
  const message = error.message ?? '';

  switch (code) {
    case 'document_file_required':
      return { file: t('admin.student360.documents.errors.fileRequired') };
    case 'document_file_too_large':
      return { file: t('admin.student360.documents.errors.fileTooLarge') };
    case 'document_file_type_not_allowed':
      return { file: t('admin.student360.documents.errors.fileTypeNotAllowed') };
    case 'invalid_document_type':
      return { documentType: t('admin.student360.documents.errors.invalidType') };
    case 'invalid_document_dates':
      return { expiryDate: t('admin.student360.documents.errors.invalidDates') };
    case 'student_document_not_found':
      return { general: t('admin.student360.documents.errors.notFound') };
    case 'forbidden':
      return { general: t('admin.student360.documents.errors.forbidden') };
    case 'not_found':
      return { general: t('admin.student360.documents.errors.notFound') };
    case 'validation_error':
      if (message.toLowerCase().includes('expiry') || message.toLowerCase().includes('issue')) {
        return { expiryDate: t('admin.student360.documents.errors.invalidDates') };
      }
      if (message.toLowerCase().includes('file')) {
        return { file: message || t('admin.student360.documents.errors.fileRequired') };
      }
      return { general: message || t('admin.studentValidation') };
    default:
      return { general: message || t('errors.generic') };
  }
}
