'use client';

import { useEffect } from 'react';
import { authApi } from '@/lib/api/client';
import { useT } from '@/features/i18n/locale-context';
import type { ApiErrorBody } from '@/types/api';

export function LoadingState({ label }: { label?: string }) {
  const t = useT();
  return (
    <div className="state">
      <div className="spinner" />
      <div className="muted">{label ?? t('common.loading')}</div>
    </div>
  );
}

export function EmptyState({
  icon = '—',
  title,
  description,
  action,
  compact = false,
}: {
  icon?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <div className={compact ? 'state state--compact' : 'state'}>
      <div className="state-icon state-icon--empty" aria-hidden="true">{icon}</div>
      <div className="state__title">{title ?? t('empty.default')}</div>
      {description && <div className="state__desc">{description}</div>}
      {action}
    </div>
  );
}

export function PermissionDeniedState({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const t = useT();
  return (
    <div className="state">
      <div className="state-icon state-icon--lock" aria-hidden="true">&#128274;</div>
      <div className="state__title">{title ?? t('errors.forbiddenTitle')}</div>
      <div className="state__desc">{description ?? t('errors.forbidden')}</div>
    </div>
  );
}

export function NoActiveSchoolState() {
  const t = useT();
  return (
    <div className="state">
      <div className="state-icon state-icon--lock" aria-hidden="true">&#127979;</div>
      <div className="state__title">{t('admin.chooseSchoolTitle')}</div>
      <div className="state__desc">{t('admin.chooseSchoolDesc')}</div>
    </div>
  );
}

export function SchoolEmptyState({ description }: { description?: string }) {
  const t = useT();
  return (
    <div className="state">
      <div className="state-icon state-icon--empty" aria-hidden="true">&#127979;</div>
      <div className="state__title">{t('admin.noScopeTitle')}</div>
      <div className="state__desc">{description ?? t('admin.noScopeDesc')}</div>
    </div>
  );
}

export function NotFoundState({ description }: { description?: string }) {
  const t = useT();
  return (
    <div className="state">
      <div className="state-icon state-icon--empty" aria-hidden="true">&#8709;</div>
      <div className="state__title">{t('errors.notFoundTitle')}</div>
      <div className="state__desc">{description ?? t('errors.notFound')}</div>
    </div>
  );
}

export function SessionExpiredState() {
  const t = useT();
  useEffect(() => {
    const timer = setTimeout(() => {
      authApi.logout().finally(() => {
        window.location.href = '/login?expired=1';
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="state">
      <div className="state-icon state-icon--session" aria-hidden="true">&#8987;</div>
      <div className="state__title">{t('errors.sessionExpired')}</div>
      <div className="state__desc">{t('errors.sessionExpiredDesc')}</div>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: ApiErrorBody;
  onRetry?: () => void;
}) {
  const t = useT();
  return (
    <div className="state">
      <div className="state-icon state-icon--error" aria-hidden="true">!</div>
      <div className="state__title">{t('errors.serverErrorTitle')}</div>
      <div className="state__desc">
        {error.message && !error.message.startsWith('Error:')
          ? error.message
          : t('errors.serverError')}
      </div>
      {onRetry && (
        <button className="btn btn--ghost btn--sm mt-2" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

function isStaleActiveSchoolMessage(message: string | undefined): boolean {
  const m = message?.toLowerCase() ?? '';
  return m.includes('active_school') && (m.includes('allowed') || m.includes('permitted'));
}

export function ApiErrorView({
  error,
  onRetry,
}: {
  error: ApiErrorBody;
  onRetry?: () => void;
}) {
  const t = useT();

  if (isStaleActiveSchoolMessage(error.message)) {
    return (
      <PermissionDeniedState
        title={t('admin.activeSchoolResetTitle')}
        description={t('admin.activeSchoolResetDesc')}
      />
    );
  }

  switch (error.code) {
    case 'unauthenticated':
      return <SessionExpiredState />;
    case 'permission_denied':
    case 'forbidden':
      return <PermissionDeniedState description={error.message} />;
    case 'not_found':
      return <NotFoundState description={error.message} />;
    default:
      return <ErrorState error={error} onRetry={onRetry} />;
  }
}
