'use client';

import { useCallback, useState } from 'react';
import { TeacherSetupForm } from './teacher-setup-form';
import { useT } from '@/features/i18n/locale-context';
import { canManageTeachingAssignments } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
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
  const user = useSession();
  const canManageAssignments = canManageTeachingAssignments(user);
  const [closeHandler, setCloseHandler] = useState<(() => void) | null>(null);
  const registerClose = useCallback((handler: () => void) => {
    setCloseHandler(() => handler);
  }, []);

  return (
    <SetupDrawer
      open={open}
      title={teacher ? t('admin.academicSetup.editTeacher') : t('admin.addTeacher')}
      onClose={() => (closeHandler ?? onClose)()}
    >
      <TeacherSetupForm
        teacher={teacher}
        layout="drawer"
        canManageAssignments={canManageAssignments}
        onRegisterClose={registerClose}
        onSaved={(id) => {
          onSaved(id);
          onClose();
        }}
        onCancel={onClose}
      />
    </SetupDrawer>
  );
}
