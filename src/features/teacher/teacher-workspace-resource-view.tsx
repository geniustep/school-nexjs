'use client';

import type { ReactNode } from 'react';
import { ResourceView } from '@/components/states/resource';
import type { ResourceState } from '@/lib/hooks/use-resource';

interface TeacherWorkspaceResourceViewProps<T> {
  state: ResourceState<T>;
  children: (data: T) => ReactNode;
  loadingLabel?: string;
  linkingTitleKey?: string;
  compactLinking?: boolean;
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
}

/** Teacher workspace wrapper — forces linking UI for normalized /teacher/* 403 errors. */
export function TeacherWorkspaceResourceView<T>({
  state,
  children,
  loadingLabel,
  linkingTitleKey,
  compactLinking,
  empty,
  isEmpty,
}: TeacherWorkspaceResourceViewProps<T>) {
  return (
    <ResourceView
      state={state}
      loadingLabel={loadingLabel}
      linkingTitleKey={linkingTitleKey}
      compactLinking={compactLinking}
      teacherWorkspace
      empty={empty}
      isEmpty={isEmpty}
    >
      {children}
    </ResourceView>
  );
}
