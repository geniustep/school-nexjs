'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader } from '@/components/ui/primitives';
import { HomeworkDetailPanel } from '@/features/academic/homework-detail-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { HomeworkDetail } from '@/types/homework';

export default function StudentHomeworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useResource<HomeworkDetail>(endpoints.student.homework(id));

  return (
    <>
      <Link href="/student/homeworks" className="back-link">
        ‹ {t('academic.backToHomework')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(hw) => (
          <>
            <PageHeader title={hw.name} subtitle={hw.subject?.name ?? undefined} />
            <HomeworkDetailPanel
              hw={hw}
              readPath={endpoints.student.homeworkRead(id)}
              submitPath={endpoints.student.homeworkSubmit(id)}
              onUpdated={() => state.reload()}
            />
          </>
        )}
      </ResourceView>
    </>
  );
}
