'use client';

import { Badge, Card, SectionHead } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel, workflowTone } from '@/lib/utils/labels';
import { registrationTypeLabel } from '../utils/enrollment-labels';
import { refOrStringLabel, studentClassLabel, studentLevelLabel } from '../utils/student-academic-labels';
import { Student360FieldGrid } from './student-360-field-grid';
import type { StudentEnrollment } from '@/types/student-360';

function dash(t: (k: string) => string, value: string | null | undefined): string {
  return value?.trim() ? value : t('common.dash');
}

export function CurrentEnrollmentCard({ enrollment }: { enrollment: StudentEnrollment }) {
  const t = useT();
  const { formatDate } = useFormat();

  const yearLabel = refOrStringLabel(enrollment.academic_year);
  const levelLabel = studentLevelLabel(enrollment.level);
  const classLabel = studentClassLabel(enrollment.class);
  const registrationLabel = registrationTypeLabel(t, enrollment.registration_type);
  const stateLabel = statusLabel(t, enrollment.state);
  const showPreviousSchool =
    enrollment.registration_type === 'transfer' && enrollment.previous_school?.trim();
  const showActualJoin =
    enrollment.actual_join_date?.trim() &&
    enrollment.actual_join_date.trim() !== (enrollment.date_start ?? '').trim();

  const gridItems = [
    { label: t('admin.student360.dateStart'), value: formatDate(enrollment.date_start) || t('common.dash') },
    ...(showActualJoin
      ? [{ label: t('admin.student360.actualJoinDate'), value: formatDate(enrollment.actual_join_date) }]
      : []),
    ...(enrollment.date_end?.trim()
      ? [{ label: t('admin.student360.dateEnd'), value: formatDate(enrollment.date_end) }]
      : []),
    { label: t('admin.student360.registrationType'), value: registrationLabel || t('common.dash') },
    ...(enrollment.track
      ? [{ label: t('admin.student360.track'), value: refOrStringLabel(enrollment.track) }]
      : []),
    ...(showPreviousSchool
      ? [{ label: t('admin.student360.previousSchool'), value: enrollment.previous_school!.trim() }]
      : []),
    ...(enrollment.registration_notes?.trim()
      ? [{ label: t('admin.student360.registrationNotes'), value: enrollment.registration_notes.trim() }]
      : []),
  ];

  return (
    <Card className="student-360-section-card student-360-current-enrollment">
      <SectionHead
        title={t('admin.student360.currentEnrollment')}
        action={
          <div className="student-360-current-enrollment__badges">
            <Badge tone={workflowTone(enrollment.state)}>{stateLabel}</Badge>
            {registrationLabel ? (
              <Badge tone="blue">{registrationLabel}</Badge>
            ) : null}
            {enrollment.is_repeating ? (
              <Badge tone="amber">{t('admin.student360.isRepeating')}</Badge>
            ) : null}
          </div>
        }
      />
      <div className="student-360-section-card__body">
        <div className="student-360-current-enrollment__summary">
          <p className="student-360-current-enrollment__year">{yearLabel}</p>
          <p className="student-360-current-enrollment__placement">
            {[levelLabel, classLabel].filter((v) => v && v !== '—').join(' · ') || dash(t, null)}
          </p>
          {enrollment.school ? (
            <p className="student-360-current-enrollment__school tiny muted">
              {refOrStringLabel(enrollment.school)}
            </p>
          ) : null}
        </div>
        <Student360FieldGrid columns={2} items={gridItems} />
      </div>
    </Card>
  );
}
