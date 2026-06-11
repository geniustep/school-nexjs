'use client';

import { ClassForm, type ClassDetail } from '@/features/admin/entity-forms';
import { Badge, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { SetupDrawer } from './setup-drawer';
import type { SchoolClass } from '@/types/class';

export function ClassDrawer({
  open,
  mode,
  cls,
  defaultLevelId,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: 'view' | 'edit' | 'create';
  cls?: SchoolClass | ClassDetail | null;
  defaultLevelId?: number;
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
                    level: { id: defaultLevelId, name: '' },
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
  const unassignedSubjects = (cls.subjects ?? []).filter(
    (s) => !(cls.teachers ?? []).some(() => false),
  );

  return (
    <div className="col" style={{ gap: 12 }}>
      <div>
        <SectionHead title={cls.name} />
        <p className="muted tiny">{cls.level?.name ?? t('common.dash')}</p>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <Badge tone={cls.status === 'active' ? 'green' : 'slate'}>{cls.status}</Badge>
        <span className="tiny muted">
          {t('admin.academicSetup.classMeta', {
            students: cls.student_count ?? 0,
            subjects: cls.subjects?.length ?? 0,
          })}
        </span>
      </div>
      <div>
        <strong className="tiny muted">{t('nav.teachers')}</strong>
        <p>{cls.teachers?.map((te) => te.name).join(', ') || t('common.dash')}</p>
      </div>
      <div>
        <strong className="tiny muted">{t('nav.subjects')}</strong>
        <p>{cls.subjects?.map((s) => s.name).join(', ') || t('common.dash')}</p>
      </div>
      {cls.room_number && (
        <div>
          <strong className="tiny muted">{t('academic.room')}</strong>
          <p>{cls.room_number}</p>
        </div>
      )}
      {unassignedSubjects.length > 0 && (
        <p className="tiny muted">{t('admin.academicSetup.viewAssignmentsHint')}</p>
      )}
    </div>
  );
}
