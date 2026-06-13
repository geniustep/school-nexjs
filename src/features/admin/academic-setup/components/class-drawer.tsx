'use client';

import { ClassForm, type ClassDetail } from '@/features/admin/entity-forms';
import { Badge, SectionHead } from '@/components/ui/primitives';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { SetupDrawer } from './setup-drawer';
import { AcademicSubjectCard } from './academic-subject-card';
import {
  classDetailSubjects,
  classEffectiveSubjectsLine,
  classReadinessDetail,
  classReadinessBadge,
  classStudentCountLine,
  classSubjectsSourceLine,
} from '../utils/class-display';
import type { SchoolClass } from '@/types/class';

export function ClassDrawer({
  open,
  mode,
  cls,
  defaultLevelId,
  defaultTrackId,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: 'view' | 'edit' | 'create';
  cls?: SchoolClass | ClassDetail | null;
  defaultLevelId?: number;
  defaultTrackId?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const title =
    mode === 'create'
      ? t('admin.addClass')
      : mode === 'edit'
        ? t('admin.academicSetup.editClass')
        : cls?.name ?? t('nav.classes');

  return (
    <SetupDrawer open={open} title={title} onClose={onClose}>
      {mode === 'view' && cls ? (
        <ClassDetailView cls={cls as ClassDetail} onEdit={onClose} />
      ) : (
        <ClassForm
          cls={
            cls
              ? (cls as ClassDetail)
              : defaultLevelId
                ? ({
                    level_id: defaultLevelId,
                    track_id: defaultTrackId,
                    level: { id: defaultLevelId, name: '' },
                    track: defaultTrackId ? { id: defaultTrackId, name: '' } : null,
                  } as ClassDetail)
                : undefined
          }
          onSaved={() => {
            onSaved();
            onClose();
          }}
          onCancel={onClose}
        />
      )}
    </SetupDrawer>
  );
}

function ClassDetailView({
  cls,
}: {
  cls: ClassDetail;
  onEdit: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const subjects = classDetailSubjects(cls);
  const sourceLine = classSubjectsSourceLine(t, locale, cls);
  const readinessDetail = classReadinessDetail(t, cls);
  const readinessBadge = classReadinessBadge(t, locale, cls);

  return (
    <div className="col" style={{ gap: 12 }}>
      <div>
        <SectionHead title={cls.name} />
        <p className="muted tiny">
          {cls.level?.name ?? t('common.dash')}
          {cls.track?.name ? ` · ${cls.track.name}` : ''}
        </p>
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <Badge tone={cls.status === 'active' ? 'green' : 'slate'}>{cls.status}</Badge>
        <span className="tiny muted">{classEffectiveSubjectsLine(t, locale, cls)}</span>
        {sourceLine && <span className="tiny muted">{sourceLine}</span>}
        <span className="tiny muted">
          {classStudentCountLine(t, locale, cls.student_count ?? 0)}
        </span>
        {readinessBadge && <Badge tone="amber">{readinessBadge}</Badge>}
      </div>
      {readinessDetail && <p className="tiny muted">{readinessDetail}</p>}
      <div>
        <strong className="tiny muted">{t('nav.teachers')}</strong>
        <p>{cls.teachers?.map((te) => te.name).join(', ') || t('common.dash')}</p>
      </div>
      <div>
        <strong className="tiny muted">{t('nav.subjects')}</strong>
        {subjects.length ? (
          <div className="col" style={{ gap: 8, marginTop: 8 }}>
            {subjects.map((subject) => (
              <AcademicSubjectCard
                key={subject.id}
                subject={subject}
                missingAssignment={(cls.missing_teacher_assignments_count ?? 0) > 0}
              />
            ))}
          </div>
        ) : (
          <p>{t('common.dash')}</p>
        )}
      </div>
      {cls.room_number && (
        <div>
          <strong className="tiny muted">{t('academic.room')}</strong>
          <p>{cls.room_number}</p>
        </div>
      )}
      <p className="tiny muted">{t('admin.academicSetup.viewAssignmentsHint')}</p>
    </div>
  );
}
