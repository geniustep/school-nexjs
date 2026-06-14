import type { StudentDocument } from '@/types/student-360';
import { documentTypeCode } from './normalize-student-documents';

/** Presentation-only i18n mapping for document type codes from API. */
const DOCUMENT_TYPE_I18N_KEYS: Record<string, string> = {
  birth_certificate: 'admin.student360.documents.types.birthCertificate',
  guardian_id_copy: 'admin.student360.documents.types.guardianIdCopy',
  guardian_id: 'admin.student360.documents.types.guardianIdCopy',
  student_photo: 'admin.student360.documents.types.studentPhoto',
  medical_certificate: 'admin.student360.documents.types.medicalCertificate',
  vaccination_record: 'admin.student360.documents.types.vaccinationRecord',
  transfer_certificate: 'admin.student360.documents.types.transferCertificate',
  report_card: 'admin.student360.documents.types.reportCard',
};

function normalizeCode(code: string): string {
  return code.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Resolve a localized label for a document type without changing API values. */
export function resolveDocumentTypeLabel(
  documentType: StudentDocument['document_type'],
  t: (key: string) => string,
): string {
  const code = documentTypeCode(documentType);
  if (code) {
    const key = DOCUMENT_TYPE_I18N_KEYS[normalizeCode(code)];
    if (key) {
      const translated = t(key);
      if (translated !== key) return translated;
    }
  }
  if (!documentType) return '';
  if (typeof documentType === 'string') return documentType;
  return documentType.name || documentType.code;
}
