'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TeacherCreateForm } from './teacher-create-form';
import { TeacherSetupForm } from './teacher-setup-form';
import { useT } from '@/features/i18n/locale-context';
import { canManageTeachingAssignments } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import type { Teacher, TeacherCreateResult } from '@/types/teacher';
import { SetupDrawer } from './setup-drawer';

export function TeacherFormDrawer({
  open,
  teacher,
  onClose,
  onSaved,
  initialStep,
}: {
  open: boolean;
  teacher?: Teacher;
  onClose: () => void;
  onSaved: (id: number) => void;
  initialStep?: 'profile' | 'assignments';
}) {
  const t = useT();
  const user = useSession();
  const canManageAssignments = canManageTeachingAssignments(user);
  const [closeHandler, setCloseHandler] = useState<(() => void) | null>(null);
  const [createSuccess, setCreateSuccess] = useState<TeacherCreateResult | null>(null);
  const registerClose = useCallback((handler: () => void) => {
    setCloseHandler(() => handler);
  }, []);

  const creating = !teacher;

  useEffect(() => {
    if (!open) setCreateSuccess(null);
  }, [open]);

  function handleDrawerClose() {
    if (createSuccess) {
      setCreateSuccess(null);
      onClose();
      return;
    }
    (closeHandler ?? onClose)();
  }

  return (
    <SetupDrawer
      open={open}
      title={
        createSuccess
          ? t('admin.academicSetup.teacherCreate.drawerSuccessTitle')
          : teacher
            ? t('admin.academicSetup.editTeacher')
            : t('admin.addTeacher')
      }
      onClose={handleDrawerClose}
    >
      {createSuccess ? (
        <div className="teacher-setup-form teacher-setup-form--drawer" data-testid="teacher-create-drawer-success">
          <p>{t('admin.academicSetup.teacherCreate.drawerSuccessBody')}</p>
          <div className="teacher-setup-form__actions row">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setCreateSuccess(null);
                onClose();
              }}
            >
              {t('common.close')}
            </button>
            <Link
              href={`/admin/teachers/${createSuccess.teacher_id}`}
              className="btn btn--primary btn--sm"
              onClick={() => {
                setCreateSuccess(null);
                onClose();
              }}
            >
              {t('admin.academicSetup.teacherCreate.openTeacherProfile')}
            </Link>
          </div>
        </div>
      ) : creating ? (
        <TeacherCreateForm
          layout="drawer"
          canManageAssignments={canManageAssignments}
          onSaved={(id, result) => {
            onSaved(id);
            setCreateSuccess(result);
          }}
          onCancel={onClose}
        />
      ) : (
        <TeacherSetupForm
          teacher={teacher}
          layout="drawer"
          initialStep={initialStep}
          canManageAssignments={canManageAssignments}
          onRegisterClose={registerClose}
          onSaved={(id) => {
            onSaved(id);
            onClose();
          }}
          onCancel={onClose}
        />
      )}
    </SetupDrawer>
  );
}
