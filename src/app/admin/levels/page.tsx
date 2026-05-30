'use client';

import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card, Badge, SectionHead } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import type { Level } from '@/types/class';

export default function AdminLevelsPage() {
  const state = useResource<Level[]>(endpoints.admin.levels);

  return (
    <>
      <PageHeader title="Levels" subtitle="Educational levels within your access" />
      <ResourceView
        state={state}
        loadingLabel="Loading levels…"
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="📚" title="No levels found" />}
      >
        {(levels) => (
          <div className="grid grid--cards">
            {levels.map((lvl) => (
              <Card key={lvl.id}>
                <SectionHead title={lvl.name} />
                {lvl.code && <p className="tiny faint mono">{lvl.code}</p>}
                {lvl.subjects?.length ? (
                  <div className="wrap-gap mt-2">
                    {lvl.subjects.map((s) => (
                      <Badge key={s.id} tone="slate">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="muted tiny mt-2">No subjects listed.</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
