'use client';

// Canonical UI states. Every data view composes these so loading / empty /
// error / permission-denied / unauthenticated look consistent everywhere.

import { useEffect } from 'react';
import { authApi } from '@/lib/api/client';
import type { ApiErrorBody } from '@/types/api';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state">
      <div className="spinner" />
      <div className="muted">{label}</div>
    </div>
  );
}

export function EmptyState({
  icon = '—',
  title = 'Nothing here yet',
  description,
  action,
}: {
  icon?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state">
      <div className="state-icon state-icon--empty" aria-hidden="true">{icon}</div>
      <div className="state__title">{title}</div>
      {description && <div className="state__desc">{description}</div>}
      {action}
    </div>
  );
}

export function PermissionDeniedState({
  description = 'You do not have access to this content. If you believe this is a mistake, contact your school administrator.',
}: {
  description?: string;
}) {
  return (
    <div className="state">
      <div className="state-icon state-icon--lock" aria-hidden="true">&#128274;</div>
      <div className="state__title">Access restricted</div>
      <div className="state__desc">{description}</div>
    </div>
  );
}

export function NotFoundState({
  description = "We couldn’t find what you were looking for.",
}: {
  description?: string;
}) {
  return (
    <div className="state">
      <div className="state-icon state-icon--empty" aria-hidden="true">&#8709;</div>
      <div className="state__title">Not found</div>
      <div className="state__desc">{description}</div>
    </div>
  );
}

/**
 * Session-expired handler. When the API reports `unauthenticated` we clear the
 * local session and bounce to login.
 */
export function SessionExpiredState() {
  useEffect(() => {
    const t = setTimeout(() => {
      authApi.logout().finally(() => {
        window.location.href = '/login?expired=1';
      });
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="state">
      <div className="state-icon state-icon--session" aria-hidden="true">&#8987;</div>
      <div className="state__title">Session expired</div>
      <div className="state__desc">Your session has ended. Redirecting you to sign in…</div>
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
  return (
    <div className="state">
      <div className="state-icon state-icon--error" aria-hidden="true">!</div>
      <div className="state__title">Something went wrong</div>
      <div className="state__desc">
        {error.message && !error.message.startsWith('Error:')
          ? error.message
          : 'There was a problem loading this content. Please try again.'}
      </div>
      {onRetry && (
        <button className="btn btn--ghost btn--sm mt-2" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * Dispatch the right state for an API error code. Returns null for codes that
 * the caller should handle as a normal error.
 */
export function ApiErrorView({
  error,
  onRetry,
}: {
  error: ApiErrorBody;
  onRetry?: () => void;
}) {
  switch (error.code) {
    case 'unauthenticated':
      return <SessionExpiredState />;
    case 'permission_denied':
      return <PermissionDeniedState description={error.message} />;
    case 'not_found':
      return <NotFoundState description={error.message} />;
    default:
      return <ErrorState error={error} onRetry={onRetry} />;
  }
}
