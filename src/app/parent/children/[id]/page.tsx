'use client';

import { use } from 'react';
import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Card, Badge, DefinitionList, SectionHead, Avatar } from '@/components/ui/primitives';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { ChildAcademicActions } from '@/features/parent/child-academic-actions';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { ChildSummary } from '@/types/student';

function statusText(t: ReturnType<typeof useT>, status: string | undefined) {
  if (!status) return t('common.dash');
  const key = `states.${status}`;
  const label = t(key);
  return label === key ? status : label;
}

export default function ParentChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useResource<ChildSummary>(endpoints.parent.child(id));

  return (
    <>
      <Link href="/parent/children" className="back-link">
        ‹ {t('nav.myChildren')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(c) => (
          <>
            <PageHeader
              title={getStudentDisplayName(c)}
              subtitle={
                [c.class?.name, c.level?.name].filter(Boolean).join(' · ') ||
                (c.code ? String(c.code) : undefined)
              }
              actions={
                c.status ? (
                  <Badge tone={c.status === 'active' ? 'green' : 'slate'}>
                    {statusText(t, c.status)}
                  </Badge>
                ) : undefined
              }
            />
            <ChildSubnav id={id} />
            <ChildAcademicActions childId={id} />
            <Card>
              <div className="row" style={{ marginBlockEnd: 16 }}>
                <Avatar name={getStudentDisplayName(c)} />
                <SectionHead title={t('nav.overview')} />
              </div>
              <DefinitionList
                items={[
                  { label: t('academic.status'), value: statusText(t, c.status) },
                ]}
              />
            </Card>
          </>
        )}
      </ResourceView>
    </>
  );
}
