'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card, Avatar, Badge } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import type { ChildSummary } from '@/types/student';

export default function ParentChildrenPage() {
  // Only linked children are returned (server-enforced).
  const state = useResource<ChildSummary[]>(endpoints.parent.children);

  return (
    <>
      <PageHeader title="My Children" subtitle="Children linked to your account" />
      <ResourceView
        state={state}
        loadingLabel="Loading your children…"
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="👧" title="No children linked" description="No children are linked to your account yet." />}
      >
        {(children) => (
          <div className="grid grid--cards">
            {children.map((c) => (
              <Link key={c.id} href={`/parent/children/${c.id}`}>
                <Card className="row-link">
                  <div className="row">
                    <Avatar name={c.full_name} />
                    <div className="col" style={{ gap: 2 }}>
                      <strong>{c.full_name}</strong>
                      <span className="tiny muted">{c.class?.name ?? '—'}</span>
                    </div>
                  </div>
                  {c.status && (
                    <div className="mt-4">
                      <Badge tone={c.status === 'active' ? 'green' : 'slate'}>
                        {statusLabel(c.status)}
                      </Badge>
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
