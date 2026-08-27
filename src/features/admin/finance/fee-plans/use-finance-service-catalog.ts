'use client';

import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { FinanceServiceCatalogItem } from '@/features/admin/student-finance/types';

export function useFinanceServiceCatalogOptions(enabled = true): {
  services: FinanceServiceCatalogItem[];
  loading: boolean;
  reload: () => void;
} {
  const state = useAdminResource<FinanceServiceCatalogItem[]>(
    enabled ? endpoints.admin.financeServices : null,
    enabled ? { page: 1, page_size: 200 } : undefined,
  );
  return {
    services: state.data ?? [],
    loading: state.loading,
    reload: state.reload,
  };
}
