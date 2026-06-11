'use client';

import { TeacherForm } from '@/features/admin/entity-forms';
import { useT } from '@/features/i18n/locale-context';
import type { Teacher } from '@/types/teacher';
import { SetupDrawer } from './setup-drawer';

export function TeacherFormDrawer({
  open,
  teacher,
  onClose,
  onSaved,
}: {
  open: boolean;
  teacher?: Teacher;
  onClose: () => void;
  onSaved: (id: number) => void;
}) {
  const t = useT();

  return (
    <SetupDrawer
      open={open}
      title={teacher ? t('admin.academicSetup.editTeacher') : t('admin.addTeacher')}
      onClose={onClose}
    >
      <TeacherForm
        teacher={teacher}
        onSaved={(id) => {
          onSaved(id);
          onClose();
        }}
        onCancel={onClose}
      />
      {!teacher && (
        <p className="tiny muted mt-2">{t('admin.academicSetup.teacherFormHint')}</p>
      )}
    </SetupDrawer>
  );
}
