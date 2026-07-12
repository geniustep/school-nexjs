'use client';

import { formatAcademicClassLabel } from '@/features/admin/academic-setup/utils/format-academic-label';
import { NumericText } from '@/components/ui/numeric-text';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import { useSchoolClassSummary } from '../hooks/use-school-class-summary';

function capacityFillPercent(studentCount: number, capacity: number | null): number | null {
  if (!capacity || capacity <= 0) return null;
  return Math.min(100, Math.round((studentCount / capacity) * 100));
}

export function EnrollmentClassSummaryPanel({
  classId,
  activeSchoolId,
}: {
  classId: string;
  activeSchoolId?: number | null;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { loading, error, data } = useSchoolClassSummary(classId, activeSchoolId);

  if (!classId.trim()) return null;

  if (loading) {
    return (
      <div className="enrollment-class-summary enrollment-class-summary--loading" role="status">
        {t('admin.student360.create.classSummary.loading')}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="enrollment-class-summary enrollment-class-summary--error" role="status">
        {t('admin.student360.create.classSummary.loadError')}
      </div>
    );
  }

  const students = data.student_count ?? 0;
  const capacity = data.capacity;
  const hasCapacity = capacity != null && capacity > 0;
  const availableSeats = hasCapacity ? Math.max(0, capacity - students) : null;
  const fillPct = hasCapacity ? capacityFillPercent(students, capacity) : null;
  const isFull = availableSeats === 0;
  const label = formatAcademicClassLabel(data, locale);
  const subjectsCount =
    data.effective_subjects_count ??
    data.subjects_count ??
    (data.subjects?.length ? data.subjects.length : null);

  return (
    <div
      className={`enrollment-class-summary${isFull ? ' enrollment-class-summary--full' : ''}`}
      role="region"
      aria-label={t('admin.student360.create.classSummary.title')}
    >
      <div className="enrollment-class-summary__head">
        <p className="enrollment-class-summary__title">{label.primary}</p>
        {label.secondary ? (
          <span className="enrollment-class-summary__code mono" dir="ltr">
            {label.secondary}
          </span>
        ) : null}
        {data.track?.name ? (
          <span className="enrollment-class-summary__track">{data.track.name}</span>
        ) : null}
      </div>

      <dl className="enrollment-class-summary__stats">
        <div className="enrollment-class-summary__stat">
          <dt>{t('admin.student360.create.classSummary.students')}</dt>
          <dd>
            <NumericText>{students}</NumericText>
          </dd>
        </div>
        {hasCapacity ? (
          <>
            <div className="enrollment-class-summary__stat">
              <dt>{t('admin.capacity')}</dt>
              <dd>
                <NumericText>{capacity}</NumericText>
              </dd>
            </div>
            <div className="enrollment-class-summary__stat">
              <dt>{t('admin.student360.create.classSummary.availableSeats')}</dt>
              <dd className={isFull ? 'enrollment-class-summary__warn' : undefined}>
                <NumericText>{availableSeats}</NumericText>
              </dd>
            </div>
          </>
        ) : null}
        {data.teachers?.length ? (
          <div className="enrollment-class-summary__stat">
            <dt>{t('nav.teachers')}</dt>
            <dd>
              <NumericText>{data.teachers.length}</NumericText>
            </dd>
          </div>
        ) : null}
        {subjectsCount != null && subjectsCount > 0 ? (
          <div className="enrollment-class-summary__stat">
            <dt>{t('nav.subjects')}</dt>
            <dd>
              <NumericText>{subjectsCount}</NumericText>
            </dd>
          </div>
        ) : null}
        <div className="enrollment-class-summary__stat">
          <dt>{t('common.status')}</dt>
          <dd>{statusLabel(t, data.status)}</dd>
        </div>
      </dl>

      {fillPct != null ? (
        <div
          className="enrollment-class-summary__capacity"
          role="progressbar"
          aria-valuenow={fillPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('admin.student360.create.classSummary.occupancy', { percent: fillPct })}
        >
          <div className="enrollment-class-summary__capacity-bar" style={{ width: `${fillPct}%` }} />
        </div>
      ) : null}

      {isFull ? (
        <p className="enrollment-class-summary__notice">{t('admin.student360.create.classSummary.fullWarning')}</p>
      ) : null}
    </div>
  );
}
