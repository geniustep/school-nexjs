'use client';

// Generic render wrapper that turns a ResourceState into the right UI:
// loading → error/permission/session → empty → content. Keeps every data page
// consistent and tiny.

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { ResourceState } from '@/lib/hooks/use-resource';
import { shouldRenderTeacherLinkingState } from '@/lib/auth/teacher-workspace-api';
import { TeacherLinkingState } from '@/features/teacher/teacher-linking-state';
import { ApiErrorView, EmptyState, LoadingState } from './states';

interface ResourceViewProps<T> {
  state: ResourceState<T>;
  children: (data: T) => ReactNode;
  loadingLabel?: string;
  loadingFallback?: ReactNode;
  empty?: ReactNode;
  /** Treat data as empty when this returns true (e.g. empty array). */
  isEmpty?: (data: T) => boolean;
  /** Override teacher workspace linking title (defaults to dashboard title). */
  linkingTitleKey?: string;
  /** Compact linking state for cards/sections inside teacher workspace. */
  compactLinking?: boolean;
  /** Force teacher linking behavior on or off; default follows /teacher pathname. */
  teacherWorkspace?: boolean;
}

export function ResourceView<T>({
  state,
  children,
  loadingLabel,
  loadingFallback,
  empty,
  isEmpty,
  linkingTitleKey,
  compactLinking = false,
  teacherWorkspace,
}: ResourceViewProps<T>) {
  const pathname = usePathname();

  if (state.initialLoading) {
    return <>{loadingFallback ?? <LoadingState label={loadingLabel} />}</>;
  }
  if (state.error) {
    if (
      shouldRenderTeacherLinkingState(state.error, {
        teacherWorkspace,
        pathname,
      })
    ) {
      return (
        <TeacherLinkingState
          titleKey={linkingTitleKey}
          compact={compactLinking}
          onRetry={state.reload}
        />
      );
    }
    return <ApiErrorView error={state.error} onRetry={state.reload} />;
  }
  if (state.data === null) {
    return <>{loadingFallback ?? <LoadingState label={loadingLabel} />}</>;
  }
  if (!state.loading && !state.error && isEmpty?.(state.data)) {
    return <>{empty ?? <EmptyState />}</>;
  }
  return <>{children(state.data)}</>;
}
