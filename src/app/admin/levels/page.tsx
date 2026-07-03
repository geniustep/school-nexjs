'use client';

import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { AdminLevelsList } from '@/features/admin/levels/components/admin-levels-list';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { Level } from '@/types/class';

export default function AdminLevelsPage() {
  const t = useT();
  const state = useAdminResource<Level[]>(endpoints.admin.levels);

  return (
    <div className="admin-workspace">
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
      >
        {(levels) => <AdminLevelsList levels={levels} />}
      </ResourceView>
    </div>
  );
}
