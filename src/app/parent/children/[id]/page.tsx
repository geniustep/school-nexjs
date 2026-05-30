'use client';

import { use } from 'react';
import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Card, Badge, DefinitionList, SectionHead, Avatar } from '@/components/ui/primitives';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import type { ChildSummary } from '@/types/student';

export default function ParentChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // permission_denied if not linked; not_found if non-existent — handled by view.
  const state = useResource<ChildSummary>(endpoints.parent.child(id));

  return (
    <>
      <Link href="/parent/children" className="back-link">
        ‹ Back to my children
      </Link>
      <ResourceView state={state} loadingLabel="Loading child…">
        {(c) => (
          <>
            <PageHeader
              title={c.full_name}
              subtitle={c.code ? `Code ${c.code}` : undefined}
              actions={
                c.status ? (
                  <Badge tone={c.status === 'active' ? 'green' : 'slate'}>
                    {statusLabel(c.status)}
                  </Badge>
                ) : undefined
              }
            />
            <ChildSubnav id={id} />
            <Card>
              <div className="row" style={{ marginBlockEnd: 16 }}>
                <Avatar name={c.full_name} />
                <SectionHead title="Overview" />
              </div>
              <DefinitionList
                items={[
                  { label: 'Full name', value: c.full_name },
                  { label: 'Class', value: c.class?.name ?? '—' },
                  { label: 'Level', value: c.level?.name ?? '—' },
                  { label: 'Status', value: c.status ? statusLabel(c.status) : '—' },
                ]}
              />
            </Card>
          </>
        )}
      </ResourceView>
    </>
  );
}
