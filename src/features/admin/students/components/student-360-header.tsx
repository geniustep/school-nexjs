'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import { computeStudentAge } from '../utils/student-age';
import { studentClassLabel, studentLevelLabel, refOrStringLabel } from '../utils/student-academic-labels';
import type { StudentDetailsData } from '@/types/student-360';

function hasBasicIdentityGap(details: StudentDetailsData): boolean {
  const s = details.student;
  return !s.date_of_birth || !s.first_name?.trim() || !s.last_name?.trim();
}

export function Student360Header({
  details,
  actions,
}: {
  details: StudentDetailsData;
  actions?: React.ReactNode;
}) {
  const t = useT();
  const s = details.student;
  const enrollment = details.current_enrollment;
  const ref = s.school_number ?? s.matricule ?? s.code ?? undefined;
  const age = computeStudentAge(s.date_of_birth);
  const school = enrollment?.school ?? s.school;
  const missingBasic = hasBasicIdentityGap(details);

  return (
    <header className="student-360-header card">
      <div className="student-360-header__main">
        <div className="student-360-header__identity">
          <div className="student-360-header__avatar" aria-hidden="true">
            {getStudentDisplayName(s).charAt(0) || '?'}
          </div>
          <div className="student-360-header__info">
            <h1 className="student-360-header__title">{getStudentDisplayName(s)}</h1>
            <div className="student-360-header__meta">
              {ref ? <span className="student-360-header__ref mono">{ref}</span> : null}
              <Badge tone={s.status === 'active' ? 'green' : 'slate'}>
                {statusLabel(t, s.status)}
              </Badge>
              {missingBasic ? (
                <span className="student-360-header__gap-badge" title={t('admin.student360.header.incompleteData')}>
                  {t('admin.student360.header.incompleteData')}
                </span>
              ) : null}
            </div>
            <dl className="student-360-header__facts">
              {enrollment?.class || s.class ? (
                <div className="student-360-header__fact">
                  <dt>{t('nav.classes')}</dt>
                  <dd>{studentClassLabel(enrollment?.class ?? s.class)}</dd>
                </div>
              ) : null}
              {enrollment?.level || s.level ? (
                <div className="student-360-header__fact">
                  <dt>{t('nav.levels')}</dt>
                  <dd>{studentLevelLabel(enrollment?.level ?? s.level)}</dd>
                </div>
              ) : null}
              {enrollment?.academic_year ? (
                <div className="student-360-header__fact">
                  <dt>{t('admin.academicYearId')}</dt>
                  <dd>{refOrStringLabel(enrollment.academic_year)}</dd>
                </div>
              ) : null}
              {school ? (
                <div className="student-360-header__fact">
                  <dt>{t('admin.finance.activeSchool')}</dt>
                  <dd>{refOrStringLabel(school)}</dd>
                </div>
              ) : null}
              {age != null ? (
                <div className="student-360-header__fact">
                  <dt>{t('admin.student360.header.age')}</dt>
                  <dd>{t('admin.student360.header.ageYears', { age })}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
        {actions ? <div className="student-360-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
