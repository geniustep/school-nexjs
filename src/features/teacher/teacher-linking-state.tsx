'use client';

import { EmptyState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';

export function TeacherLinkingState({
  titleKey = 'teacher.dashboardLoadFailedTitle',
  onRetry,
}: {
  titleKey?: string;
  onRetry?: () => void;
}) {
  const t = useT();
  return (
    <div className="t-empty">
      <EmptyState
        icon="🔗"
        title={t(titleKey)}
        description={t('teacher.profileNotLinkedDesc')}
        action={
          onRetry ? (
            <button type="button" className="btn btn--ghost btn--sm mt-2" onClick={onRetry}>
              {t('common.retry')}
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
