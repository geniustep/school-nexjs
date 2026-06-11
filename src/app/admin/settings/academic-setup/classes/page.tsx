'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState, EmptyState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { ClassDrawer } from '@/features/admin/academic-setup/components/class-drawer';
import { LevelClassGroup } from '@/features/admin/academic-setup/components/level-class-group';
import { useAcademicSetupData } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { buildLevelGroups } from '@/features/admin/academic-setup/utils/summary';
import { parseNumericFilter } from '@/features/admin/academic-setup/utils/search';
import { canManageClasses } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import type { SchoolClass } from '@/types/class';

export default function AcademicSetupClassesPage() {
  const t = useT();
  const user = useSession();
  const searchParams = useSearchParams();
  const data = useAcademicSetupData(t);
  const canManage = canManageClasses(user);

  const [drawer, setDrawer] = useState<
    | { mode: 'create'; levelId?: number }
    | { mode: 'edit' | 'view'; cls: SchoolClass }
    | null
  >(null);

  const levelGroups = useMemo(
    () => buildLevelGroups(data.levels, data.classes),
    [data.levels, data.classes],
  );

  const filterLevelId = parseNumericFilter(searchParams, 'level');
  const filterClassId = parseNumericFilter(searchParams, 'class');
  const actionAdd = searchParams.get('action') === 'add';

  const visibleGroups = filterLevelId
    ? levelGroups.filter((g) => g.id === filterLevelId)
    : levelGroups;

  if (data.loading) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.classes')} />
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (data.error) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.classes')} />
        <ErrorState
          error={{ code: 'server_error', message: t('admin.academicSetup.loadError'), details: {} }}
          onRetry={data.reload}
        />
      </>
    );
  }

  if (!levelGroups.length && !data.classes.length) {
    return (
      <>
        <PageHeader
          title={t('admin.academicSetup.nav.classes')}
          actions={
            canManage ? (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setDrawer({ mode: 'create' })}>
                + {t('admin.addClass')}
              </button>
            ) : undefined
          }
        />
        <EmptyState icon="🏫" title={t('admin.academicSetup.noClassesInLevel')} />
        <ClassDrawer
          open={!!drawer || actionAdd}
          mode="create"
          onClose={() => setDrawer(null)}
          onSaved={() => data.reload()}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('admin.academicSetup.nav.classes')}
        actions={
          canManage ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setDrawer({ mode: 'create' })}>
              + {t('admin.addClass')}
            </button>
          ) : undefined
        }
      />
      <div className="col" style={{ gap: 12 }}>
        {visibleGroups.map((group) => (
          <LevelClassGroup
            key={group.id}
            group={group}
            selectedClassId={filterClassId}
            canManage={canManage}
            onAddClass={(levelId) => setDrawer({ mode: 'create', levelId })}
            onSelectClass={(cls) => setDrawer({ mode: 'view', cls })}
          />
        ))}
      </div>
      <ClassDrawer
        open={!!drawer || actionAdd}
        mode={drawer?.mode === 'create' || actionAdd ? 'create' : drawer?.mode ?? 'view'}
        cls={drawer && 'cls' in drawer ? drawer.cls : undefined}
        defaultLevelId={drawer && 'levelId' in drawer ? drawer.levelId : undefined}
        onClose={() => setDrawer(null)}
        onSaved={() => data.reload()}
      />
    </>
  );
}
