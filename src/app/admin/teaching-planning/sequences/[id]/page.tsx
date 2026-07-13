'use client';

import { use, useMemo } from 'react';
import { ResourceView } from '@/components/states/resource';
import { DidacticSequenceDetailView } from '@/features/admin/teaching-planning/components/didactic-sequence-detail-view';
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import { normalizeDidacticSequenceDetail } from '@/features/admin/teaching-planning/utils/normalize-didactic-distribution';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import '@/features/admin/teaching-planning/teaching-planning.css';

export default function AdminDidacticSequenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useAdminResource(endpoints.admin.didacticSequence(id));
  const sequence = useMemo(
    () => (state.data ? normalizeDidacticSequenceDetail(state.data) : null),
    [state.data],
  );

  return (
    <RequireTeachingPlanningAccess>
      <div className="admin-workspace">
        <ResourceView state={{ ...state, data: sequence }} loadingLabel={t('common.loading')}>
          {(detail) => (
            <DidacticSequenceDetailView sequence={detail} onReload={() => state.reload()} />
          )}
        </ResourceView>
      </div>
    </RequireTeachingPlanningAccess>
  );
}
