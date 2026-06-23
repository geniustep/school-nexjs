'use client';

import type { ReactNode } from 'react';
import type { ResourceState } from '@/lib/hooks/use-resource';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { isTeacherWorkspaceLoadError } from '@/lib/auth/teacher-workspace-api';
import { TeacherLinkingState } from '@/features/teacher/teacher-linking-state';

interface TeacherWorkspaceResourceViewProps<T> {
  state: ResourceState<T>;
  children: (data: T) => ReactNode;
  loadingLabel?: string;
  linkingTitleKey?: string;
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
}

export function TeacherWorkspaceResourceView<T>({
  state,
  children,
  loadingLabel,
  linkingTitleKey,
  empty,
  isEmpty,
}: TeacherWorkspaceResourceViewProps<T>) {
  if (state.loading && state.data === null) {
    return <LoadingState label={loadingLabel} />;
  }
  if (state.error) {
    if (isTeacherWorkspaceLoadError(state.error)) {
      return <TeacherLinkingState titleKey={linkingTitleKey} onRetry={state.reload} />;
    }
    return <ApiErrorView error={state.error} onRetry={state.reload} />;
  }
  if (state.data === null) {
    return <LoadingState label={loadingLabel} />;
  }
  if (isEmpty?.(state.data)) {
    return <>{empty ?? <EmptyState />}</>;
  }
  return <>{children(state.data)}</>;
}
