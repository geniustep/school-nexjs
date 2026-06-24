'use client';

import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { cleanDisplayValue } from '@/features/admin/admissions/utils/admission-labels';
import { statusLabel } from '@/lib/utils/labels';
import { resolveResidenceDisplay } from '../utils/student-profile-display';
import type { StudentSummary } from '@/types/student-360';
import { DEPARTURE_STATUSES } from '../utils/student-profile';

function isMissingValue(
  value: string | null | undefined,
  notMentioned: string,
): boolean {
  const cleaned = cleanDisplayValue(value);
  return !cleaned || cleaned === notMentioned;
}

export function StudentAdmissionDataPanel({ student }: { student: StudentSummary }) {
  const t = useT();
  const { formatDate } = useFormat();
  const notMentioned = t('admin.admissions.extraFields.notMentioned');
  const showDeparture = DEPARTURE_STATUSES.has(String(student.status ?? ''));

  const chips: Array<{ label: string; value: string; highlight?: boolean }> = [];

  if (student.admission_date) {
    chips.push({
      label: t('admin.admissionDate'),
      value: formatDate(student.admission_date),
    });
  }

  const residence = resolveResidenceDisplay(student);
  if (residence && !isMissingValue(residence, notMentioned)) {
    chips.push({
      label: t('admin.student360.admissionData.residenceAddress'),
      value: residence,
    });
  }

  if (!isMissingValue(student.external_reference, notMentioned)) {
    chips.push({
      label: t('admin.student360.admissionData.externalReference'),
      value: cleanDisplayValue(student.external_reference)!,
    });
  }

  if (!isMissingValue(student.previous_school, notMentioned)) {
    chips.push({
      label: t('admin.student360.admissionData.previousSchool'),
      value: cleanDisplayValue(student.previous_school)!,
    });
  }

  if (!isMissingValue(student.admission_notes, notMentioned)) {
    chips.push({
      label: t('admin.student360.admissionData.admissionNotes'),
      value: cleanDisplayValue(student.admission_notes)!,
    });
  }

  if (showDeparture && !isMissingValue(student.departure_reason, notMentioned)) {
    chips.push({
      label: t('admin.student360.departureReason'),
      value: cleanDisplayValue(student.departure_reason)!,
    });
  }

  chips.push({
    label: t('admin.student360.studentStatus'),
    value: statusLabel(t, student.status),
    highlight: true,
  });

  return (
    <section className="student-admission-panel card" aria-labelledby="student-admission-panel-title">
      <header className="student-admission-panel__hero">
        <span className="student-admission-panel__glyph" aria-hidden="true">
          ◇
        </span>
        <h3 id="student-admission-panel-title" className="student-admission-panel__title">
          {t('admin.student360.admissionData.registrationSectionTitle')}
        </h3>
      </header>
      <div className="student-admission-panel__body">
        <div className="student-aside-chip-grid">
          {chips.map((chip) => (
            <div
              key={chip.label}
              className={[
                'student-aside-chip',
                chip.highlight ? 'student-aside-chip--highlight' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="student-aside-chip__label">{chip.label}</span>
              <span className="student-aside-chip__value" dir="auto">
                {chip.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
