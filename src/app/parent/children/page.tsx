'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card, Avatar, Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { ChildSummary } from '@/types/student';

export default function ParentChildrenPage() {
  const t = useT();
  // Only linked children are returned (server-enforced) — never infer from email/phone.
  const state = useResource<ChildSummary[]>(endpoints.parent.children);

  return (
    <>
      <PageHeader title={t('dashboard.myChildren')} subtitle={t('dashboard.parentSubtitle')} />
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="👧" title={t('empty.children')} description={t('empty.children')} />}
      >
        {(children) => (
          <div className="grid grid--cards">
            {children.map((c) => (
              <Link key={c.id} href={`/parent/children/${c.id}`}>
                <Card className="row-link">
                  <div className="row">
                    <Avatar name={getStudentDisplayName(c)} />
                    <div className="col" style={{ gap: 2 }}>
                      <strong>{getStudentDisplayName(c)}</strong>
                      <span className="tiny muted">{c.class?.name ?? '—'}</span>
                    </div>
                  </div>
                  {c.status && (
                    <div className="mt-4">
                      <Badge tone={c.status === 'active' ? 'green' : 'slate'}>
                        {statusLabel(t, c.status)}
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
