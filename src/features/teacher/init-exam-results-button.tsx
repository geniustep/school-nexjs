'use client';

import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';

interface InitExamResultsButtonProps {
  examId: number | string;
  onSuccess: () => void;
}

export function InitExamResultsButton({ examId, onSuccess }: InitExamResultsButtonProps) {
  const t = useT();

  return (
    <ConfirmActionButton
      label={t('teacher.initResults')}
      confirmMessage={t('teacher.confirmInitResults')}
      path={endpoints.teacher.examResultsInit(examId)}
      variant="primary"
      onSuccess={onSuccess}
    />
  );
}
