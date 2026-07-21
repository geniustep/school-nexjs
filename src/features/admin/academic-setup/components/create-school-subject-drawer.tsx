'use client';

import { CreateSchoolSubjectForm } from '@/features/admin/subjects/components/create-school-subject-form';
import { useT } from '@/features/i18n/locale-context';
import type { Level } from '@/types/class';
import { SetupDrawer } from './setup-drawer';

export function CreateSchoolSubjectDrawer({
  open,
  levels,
  defaultLevelIds = [],
  onClose,
  onSaved,
}: {
  open: boolean;
  levels: Level[];
  defaultLevelIds?: number[];
  onClose: () => void;
  onSaved: (subjectId: number) => void;
}) {
  const t = useT();

  return (
    <SetupDrawer
      open={open}
      title={t('admin.addSubject')}
      onClose={onClose}
      size="wide"
    >
      <CreateSchoolSubjectForm
        embedded
        levels={levels}
        defaultLevelIds={defaultLevelIds}
        onCancel={onClose}
        onSaved={(subjectId) => {
          onSaved(subjectId);
          onClose();
        }}
      />
    </SetupDrawer>
  );
}
