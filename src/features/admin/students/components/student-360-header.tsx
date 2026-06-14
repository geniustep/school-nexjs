'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
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
  const missingBasic = hasBasicIdentityGap(details);

  const studyLine = [
    enrollment?.class || s.class ? studentClassLabel(enrollment?.class ?? s.class) : null,
    enrollment?.level || s.level ? studentLevelLabel(enrollment?.level ?? s.level) : null,
    enrollment?.academic_year ? refOrStringLabel(enrollment.academic_year) : null,
    enrollment?.school || s.school ? refOrStringLabel(enrollment?.school ?? s.school) : null,
  ]
    .filter(Boolean)
    .join(' · ');

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
              {ref ? (
                <span className="student-360-header__ref mono" dir="auto" title={ref}>
                  {ref}
                </span>
              ) : null}
              <Badge tone={s.status === 'active' ? 'green' : 'slate'}>
                {statusLabel(t, s.status)}
              </Badge>
              {missingBasic ? (
                <span className="student-360-header__gap-badge" title={t('admin.student360.header.incompleteData')}>
                  {t('admin.student360.header.incompleteData')}
                </span>
              ) : null}
            </div>
            {studyLine ? (
              <p className="student-360-header__study-line" dir="auto">
                {studyLine}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="student-360-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
