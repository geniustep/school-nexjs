'use client';

import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { ParentOptions } from '@/types/parent';

export function useParentOptions(enabled = true) {
  const state = useAdminResource<ParentOptions>(enabled ? endpoints.admin.parentsOptions : null);
  return {
    options: state.data,
    loading: state.loading,
    initialLoading: state.initialLoading,
    fetching: state.fetching,
    error: state.error,
    reload: state.reload,
  };
}
