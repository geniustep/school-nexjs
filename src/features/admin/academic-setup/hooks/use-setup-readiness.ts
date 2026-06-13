'use client';

import { useCallback, useMemo } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { SetupReadinessPayload } from '@/types/academic-setup';
import type { ListParams } from '@/types/api';

export function normalizeSetupReadinessPayload(
  data: SetupReadinessPayload | null | undefined,
): SetupReadinessPayload | null {
  if (!data || typeof data !== 'object') return null;

  const features =
    data.features && typeof data.features === 'object'
      ? {
          academic_auto_setup:
            data.features.academic_auto_setup === true
              ? true
              : data.features.academic_auto_setup === false
                ? false
                : undefined,
        }
      : undefined;

  const setup_capabilities = Array.isArray(data.setup_capabilities)
    ? data.setup_capabilities.map((item) => String(item))
    : undefined;

  return {
    ...data,
    school: data.school,
    scope: data.scope,
    readiness: data.readiness,
    domains: data.domains ?? {},
    issues: Array.isArray(data.issues) ? data.issues : [],
    issues_total: data.issues_total,
    quick_actions: Array.isArray(data.quick_actions) ? data.quick_actions : data.quick_actions,
    ...(features ? { features } : {}),
    ...(setup_capabilities ? { setup_capabilities } : {}),
  };
}

export function useSetupReadiness(query?: ListParams) {
  const state = useAdminResource<SetupReadinessPayload>(endpoints.admin.setupReadiness, query);
  const reload = useCallback(() => state.reload(), [state.reload]);

  const data = useMemo(
    () => normalizeSetupReadinessPayload(state.data),
    [state.data],
  );

  return {
    data,
    loading: state.loading,
    error: state.error,
    reload,
  };
}
