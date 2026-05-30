'use client';

// No dedicated parent-detail endpoint exists in API v1 (only /admin/parents
// list). We locate the parent within the list payload. Documented limitation.

import { use } from 'react';
import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { NotFoundState } from '@/components/states/states';
import { PageHeader, Card, Badge, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel, titleCase } from '@/lib/utils/labels';
import type { Parent } from '@/types/parent';

export default function AdminParentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const state = useResource<Parent[]>(endpoints.admin.parents, { page_size: 200 });

  return (
    <>
      <Link href="/admin/parents" className="back-link">
        ‹ Back to parents
      </Link>
      <ResourceView state={state} loadingLabel="Loading parent…">
        {(list) => {
          const parent = list.find((p) => String(p.id) === id);
          if (!parent) {
            return <NotFoundState description="This parent is not within your access." />;
          }
          return (
            <>
              <PageHeader
                title={parent.name}
                subtitle={parent.relation ? titleCase(parent.relation) : undefined}
                actions={
                  <Badge tone={parent.status === 'active' ? 'green' : 'slate'}>
                    {statusLabel(parent.status)}
                  </Badge>
                }
              />
              <div className="grid grid--cards">
                <Card>
                  <SectionHead title="Contact" />
                  <DefinitionList
                    items={[
                      { label: 'Phone', value: parent.phone ?? '—' },
                      { label: 'Email', value: parent.email ?? '—' },
                      { label: 'Relation', value: parent.relation ? titleCase(parent.relation) : '—' },
                    ]}
                  />
                </Card>
                <Card>
                  <SectionHead title="Children" />
                  {parent.children.length ? (
                    <div className="col" style={{ gap: 10 }}>
                      {parent.children.map((c) => (
                        <Link
                          key={c.id}
                          href={`/admin/students/${c.id}`}
                          className="between row-link"
                        >
                          <span>{c.full_name}</span>
                          <span className="tiny faint">{c.class?.name ?? '—'}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">No linked children.</p>
                  )}
                </Card>
              </div>
            </>
          );
        }}
      </ResourceView>
    </>
  );
}
