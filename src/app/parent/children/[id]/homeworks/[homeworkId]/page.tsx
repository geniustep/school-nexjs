'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader } from '@/components/ui/primitives';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { HomeworkDetailPanel } from '@/features/academic/homework-detail-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { HomeworkDetail } from '@/types/homework';

export default function ParentChildHomeworkDetailPage({
  params,
}: {
  params: Promise<{ id: string; homeworkId: string }>;
}) {
  const { id, homeworkId } = use(params);
  const t = useT();
  const state = useResource<HomeworkDetail>(
    endpoints.parent.childHomework(id, homeworkId),
  );

  return (
    <>
      <Link href={`/parent/children/${id}/homeworks`} className="back-link">
        ‹ {t('academic.backToHomework')}
      </Link>
      <ChildSubnav id={id} />
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(hw) => (
          <>
            <PageHeader title={hw.name} subtitle={hw.subject?.name ?? undefined} />
            <HomeworkDetailPanel
              hw={hw}
              readPath={endpoints.parent.childHomeworkRead(id, homeworkId)}
              submitPath={endpoints.parent.childHomeworkSubmit(id, homeworkId)}
              onUpdated={() => state.reload()}
            />
          </>
        )}
      </ResourceView>
    </>
  );
}
