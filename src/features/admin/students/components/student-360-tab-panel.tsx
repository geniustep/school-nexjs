'use client';

import type { ReactNode } from 'react';
import { LoadingState, EmptyState } from '@/components/states/states';
import type { ApiErrorBody } from '@/types/api';

export function Student360TabPanelLoading({ label }: { label: string }) {
  return (
    <div className="student-360-tab-panel student-360-tab-panel--loading">
      <LoadingState label={label} />
    </div>
  );
}

export function Student360TabPanelError({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="student-360-tab-panel">
      <EmptyState
        icon="!"
        title={title}
        description={description}
        compact
        action={
          onRetry ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={onRetry}>
              {/* label injected by parent via title/desc; retry uses common key in caller */}
            </button>
          ) : undefined
        }
      />
    </div>
  );
}

export function Student360TabPanelErrorRetry({
  title,
  description,
  retryLabel,
  onRetry,
}: {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="student-360-tab-panel">
      <EmptyState
        icon="!"
        title={title}
        description={description}
        compact
        action={
          <button type="button" className="btn btn--primary btn--sm" onClick={onRetry}>
            {retryLabel}
          </button>
        }
      />
    </div>
  );
}

export function Student360TabPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className ?? 'student-360-tab-panel'}>{children}</div>;
}

export function mapTabApiError(error: ApiErrorBody | null | undefined): string {
  if (!error?.code) return 'api_error';
  return error.code;
}
