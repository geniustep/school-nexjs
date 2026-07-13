'use client';

import { use, useMemo } from 'react';
import { ResourceView } from '@/components/states/resource';
import { TeachingProgressDetailView } from '@/features/admin/teaching-planning/components/teaching-progress-detail-view';
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import { normalizeTeachingProgressLineDetail } from '@/features/admin/teaching-planning/utils/normalize-teaching-delivery';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';

export default function AdminTeachingProgressLineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const state = useAdminResource<unknown>(endpoints.admin.teachingProgressLine(id));
  const item = useMemo(() => (state.data ? normalizeTeachingProgressLineDetail(state.data) : null), [state.data]);
  return (
    <RequireTeachingPlanningAccess>
      <div className="admin-workspace">
        <ResourceView state={{ ...state, data: item }} loadingLabel={t('common.loading')}>
          {(detail) => <TeachingProgressDetailView item={detail} />}
        </ResourceView>
      </div>
    </RequireTeachingPlanningAccess>
  );
}
