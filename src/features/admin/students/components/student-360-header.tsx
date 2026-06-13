'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import { studentClassLabel, studentLevelLabel, refOrStringLabel } from '../utils/student-academic-labels';
import type { StudentDetailsData } from '@/types/student-360';

export function Student360Header({
  details,
  canManage,
  onEdit,
  extraActions,
}: {
  details: StudentDetailsData;
  canManage: boolean;
  onEdit?: () => void;
  extraActions?: React.ReactNode;
}) {
  const t = useT();
  const s = details.student;
  const enrollment = details.current_enrollment;
  const ref = s.matricule ?? s.code ?? undefined;

  return (
    <div className="student-360-header card">
      <div className="student-360-header__main between" style={{ gap: 16, flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 16, alignItems: 'center' }}>
          <div className="student-360-header__avatar" aria-hidden="true">
            {getStudentDisplayName(s).charAt(0) || '?'}
          </div>
          <div className="col" style={{ gap: 6 }}>
            <h1 className="student-360-header__title">{getStudentDisplayName(s)}</h1>
            {ref && <span className="tiny mono muted">{ref}</span>}
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Badge tone={s.status === 'active' ? 'green' : 'slate'}>
                {statusLabel(t, s.status)}
              </Badge>
              {enrollment?.level && (
                <span className="tiny muted">{studentLevelLabel(enrollment.level)}</span>
              )}
              {enrollment?.class && (
                <span className="tiny muted">{studentClassLabel(enrollment.class)}</span>
              )}
              {!enrollment && s.level && (
                <span className="tiny muted">{studentLevelLabel(s.level)}</span>
              )}
              {!enrollment && s.class && (
                <span className="tiny muted">{studentClassLabel(s.class)}</span>
              )}
              {enrollment?.academic_year && (
                <span className="tiny muted">{refOrStringLabel(enrollment.academic_year)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {canManage && onEdit && (
            <button type="button" className="btn btn--primary btn--sm" onClick={onEdit}>
              {t('common.edit')}
            </button>
          )}
          {extraActions}
        </div>
      </div>
    </div>
  );
}
