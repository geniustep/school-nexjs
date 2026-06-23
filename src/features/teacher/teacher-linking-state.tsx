'use client';

import { EmptyState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';

export function TeacherLinkingState({
  titleKey = 'teacher.dashboardLoadFailedTitle',
  compact = false,
  onRetry,
}: {
  titleKey?: string;
  compact?: boolean;
  onRetry?: () => void;
}) {
  const t = useT();
  const retryAction = onRetry ? (
    <button type="button" className="btn btn--ghost btn--sm mt-2" onClick={onRetry}>
      {t('common.retry')}
    </button>
  ) : undefined;

  if (compact) {
    return (
      <EmptyState
        compact
        icon="🔗"
        title={t('teacher.profileNotLinkedCompact')}
        action={retryAction}
      />
    );
  }

  return (
    <div className="t-empty">
      <EmptyState
        icon="🔗"
        title={t(titleKey)}
        description={t('teacher.profileNotLinkedDesc')}
        action={retryAction}
      />
    </div>
  );
}
