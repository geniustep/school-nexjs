'use client';

import { use, useMemo } from 'react';
import { ResourceView } from '@/components/states/resource';
import { AnnualDistributionDetailView } from '@/features/admin/teaching-planning/components/annual-distribution-detail-view';
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import { normalizeAnnualDistributionDetail } from '@/features/admin/teaching-planning/utils/normalize-didactic-distribution';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import '@/features/admin/teaching-planning/teaching-planning.css';

export default function AdminAnnualDistributionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useAdminResource(endpoints.admin.annualDistribution(id));
  const distribution = useMemo(
    () => (state.data ? normalizeAnnualDistributionDetail(state.data) : null),
    [state.data],
  );

  return (
    <RequireTeachingPlanningAccess>
      <div className="admin-workspace">
        <ResourceView state={{ ...state, data: distribution }} loadingLabel={t('common.loading')}>
          {(detail) => (
            <AnnualDistributionDetailView distribution={detail} onReload={() => state.reload()} />
          )}
        </ResourceView>
      </div>
    </RequireTeachingPlanningAccess>
  );
}
