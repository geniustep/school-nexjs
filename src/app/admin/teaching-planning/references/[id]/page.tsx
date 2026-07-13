'use client';

import { use, useMemo } from 'react';
import { ResourceView } from '@/components/states/resource';
import { TeachingReferenceDetailView } from '@/features/admin/teaching-planning/components/teaching-reference-detail-view';
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import { normalizeTeachingReferenceDetail } from '@/features/admin/teaching-planning/utils/normalize-teaching-planning';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import '@/features/admin/teaching-planning/teaching-planning.css';

export default function AdminTeachingReferenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useAdminResource(endpoints.admin.teachingReference(id));
  const reference = useMemo(
    () => (state.data ? normalizeTeachingReferenceDetail(state.data) : null),
    [state.data],
  );

  return (
    <RequireTeachingPlanningAccess>
      <div className="admin-workspace">
        <ResourceView state={{ ...state, data: reference }} loadingLabel={t('common.loading')}>
          {(detail) => (
            <TeachingReferenceDetailView reference={detail} onReload={() => state.reload()} />
          )}
        </ResourceView>
      </div>
    </RequireTeachingPlanningAccess>
  );
}
