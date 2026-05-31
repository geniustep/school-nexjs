'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card, Badge, SectionHead } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { Level } from '@/types/class';

export default function AdminLevelsPage() {
  const t = useT();
  const state = useResource<Level[]>(endpoints.admin.levels);

  return (
    <>
      <PageHeader
        title={t('nav.levels')}
        subtitle={t('admin.levelsListDesc')}
        actions={
          <AdminListActions
            addHref="/admin/levels/new"
            exportPath={endpoints.admin.levelsExport}
            exportFilename="levels.csv"
          />
        }
      />
      <ResourceView state={state} loadingLabel={t('common.loading')} isEmpty={(d) => d.length === 0} empty={<EmptyState icon="📚" title={t('admin.noLevels')} />}>
        {(levels) => (
          <div className="grid grid--cards">
            {levels.map((lvl) => (
              <Link key={lvl.id} href={`/admin/levels/${lvl.id}`}>
                <Card className="row-link">
                  <SectionHead title={lvl.name} />
                  {lvl.code && <p className="tiny faint mono">{lvl.code}</p>}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
