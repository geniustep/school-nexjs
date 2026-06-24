'use client';

import { useT } from '@/features/i18n/locale-context';
import { cleanDisplayValue } from '@/features/admin/admissions/utils/admission-labels';
import { Student360FieldGrid } from './student-360-field-grid';
import type { StudentSummary } from '@/types/student-360';

export function StudentAdmissionDataPanel({ student }: { student: StudentSummary }) {
  const t = useT();
  const empty = t('admin.admissions.extraFields.notMentioned');

  const items = [
    {
      label: t('admin.student360.admissionData.externalReference'),
      value: cleanDisplayValue(student.external_reference) || empty,
    },
    {
      label: t('admin.student360.admissionData.residenceAddress'),
      value: cleanDisplayValue(student.residence_address) || empty,
    },
    {
      label: t('admin.student360.admissionData.previousSchool'),
      value: cleanDisplayValue(student.previous_school) || empty,
    },
    {
      label: t('admin.student360.admissionData.admissionNotes'),
      value: cleanDisplayValue(student.admission_notes) || empty,
    },
  ];

  return (
    <section className="student-360-section card">
      <h3 className="student-360-section__title">
        {t('admin.student360.admissionData.registrationSectionTitle')}
      </h3>
      <Student360FieldGrid columns={2} items={items} />
    </section>
  );
}
