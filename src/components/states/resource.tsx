'use client';

// Generic render wrapper that turns a ResourceState into the right UI:
// loading → error/permission/session → empty → content. Keeps every data page
// consistent and tiny.

import type { ReactNode } from 'react';
import type { ResourceState } from '@/lib/hooks/use-resource';
import { ApiErrorView, EmptyState, LoadingState } from './states';

interface ResourceViewProps<T> {
  state: ResourceState<T>;
  children: (data: T) => ReactNode;
  loadingLabel?: string;
  loadingFallback?: ReactNode;
  empty?: ReactNode;
  /** Treat data as empty when this returns true (e.g. empty array). */
  isEmpty?: (data: T) => boolean;
}

export function ResourceView<T>({
  state,
  children,
  loadingLabel,
  loadingFallback,
  empty,
  isEmpty,
}: ResourceViewProps<T>) {
  if (state.loading && state.data === null) {
    return <>{loadingFallback ?? <LoadingState label={loadingLabel} />}</>;
  }
  if (state.error) {
    return <ApiErrorView error={state.error} onRetry={state.reload} />;
  }
  if (state.data === null) {
    return <LoadingState label={loadingLabel} />;
  }
  if (isEmpty && isEmpty(state.data)) {
    return <>{empty ?? <EmptyState />}</>;
  }
  return <>{children(state.data)}</>;
}
