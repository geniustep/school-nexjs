'use client';

import { use, useMemo } from 'react';
import { ResourceView } from '@/components/states/resource';
import { TeachingOfferingDetailView } from '@/features/admin/teaching-planning/components/teaching-offering-detail-view';
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import { normalizeTeachingOfferingDetail } from '@/features/admin/teaching-planning/utils/normalize-teaching-planning';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import '@/features/admin/teaching-planning/teaching-planning.css';

export default function AdminTeachingOfferingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useAdminResource(endpoints.admin.teachingOffering(id));
  const offering = useMemo(
    () => (state.data ? normalizeTeachingOfferingDetail(state.data) : null),
    [state.data],
  );

  return (
    <RequireTeachingPlanningAccess>
      <div className="admin-workspace">
        <ResourceView state={{ ...state, data: offering }} loadingLabel={t('common.loading')}>
          {(detail) => (
            <TeachingOfferingDetailView offering={detail} onReload={() => state.reload()} />
          )}
        </ResourceView>
      </div>
    </RequireTeachingPlanningAccess>
  );
}
