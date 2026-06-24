import type { Ref } from '@/types/api';
import type { StudentSummary } from '@/types/student-360';
import { displayCountryState } from './student-profile';

export function nationalityLabel(student: StudentSummary): string {
  if (student.nationality?.name?.trim()) return student.nationality.name.trim();
  return '';
}

export function formatStructuredAddress(student: StudentSummary): string {
  const parts = [student.street, student.district, student.city, student.zip]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.join('، ');
}

export function resolveResidenceDisplay(student: StudentSummary): string {
  const composed = formatStructuredAddress(student);
  const legacy = student.residence_address?.trim() ?? '';
  if (composed && legacy && composed !== legacy) {
    return `${composed}\n${legacy}`;
  }
  return composed || legacy;
}

export function refDisplayLabel(value: Ref | string | null | undefined): string {
  return displayCountryState(value);
}
