'use client';

import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { AdminSubjectsList } from '@/features/admin/subjects/components/admin-subjects-list';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { Level, Subject } from '@/types/class';

export default function AdminSubjectsPage() {
  const t = useT();
  const subjectsState = useAdminResource<Subject[]>(endpoints.admin.subjects);
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels);

  function reloadAll() {
    subjectsState.reload();
    levelsState.reload();
  }

  return (
    <div className="admin-workspace">
      <ResourceView
        state={subjectsState}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
      >
        {(subjects) => (
          <AdminSubjectsList subjects={subjects} levels={levelsState.data ?? []} onImportDone={reloadAll} />
        )}
      </ResourceView>
    </div>
  );
}
