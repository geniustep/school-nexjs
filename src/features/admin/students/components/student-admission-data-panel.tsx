'use client';

import { useT } from '@/features/i18n/locale-context';
import { Student360FieldGrid } from './student-360-field-grid';
import type { StudentSummary } from '@/types/student-360';

export function StudentAdmissionDataPanel({ student }: { student: StudentSummary }) {
  const t = useT();
  const empty = t('admin.admissions.extraFields.notMentioned');

  const items = [
    {
      label: t('admin.student360.admissionData.externalReference'),
      value: student.external_reference?.trim() || empty,
    },
    {
      label: t('admin.student360.admissionData.residenceAddress'),
      value: student.residence_address?.trim() || empty,
    },
    {
      label: t('admin.student360.admissionData.previousSchool'),
      value: student.previous_school?.trim() || empty,
    },
    {
      label: t('admin.student360.admissionData.admissionNotes'),
      value: student.admission_notes?.trim() || empty,
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
