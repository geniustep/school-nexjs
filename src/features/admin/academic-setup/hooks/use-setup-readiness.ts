'use client';

import { useCallback } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { SetupReadinessPayload } from '@/types/academic-setup';
import type { ListParams } from '@/types/api';

export function useSetupReadiness(query?: ListParams) {
  const state = useAdminResource<SetupReadinessPayload>(endpoints.admin.setupReadiness, query);
  const reload = useCallback(() => state.reload(), [state]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    reload,
  };
}
