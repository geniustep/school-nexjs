'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader } from '@/components/ui/primitives';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { ExamResultDetailPanel } from '@/features/academic/exam-result-detail-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ExamResult } from '@/types/exam';

export default function ParentChildExamResultDetailPage({
  params,
}: {
  params: Promise<{ id: string; resultId: string }>;
}) {
  const { id, resultId } = use(params);
  const t = useT();
  const state = useResource<ExamResult>(
    endpoints.parent.childExamResult(id, resultId),
  );

  return (
    <>
      <Link href={`/parent/children/${id}/exam-results`} className="back-link">
        ‹ {t('academic.backToResults')}
      </Link>
      <ChildSubnav id={id} />
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(result) => (
          <>
            <PageHeader title={result.exam?.name ?? t('academic.resultDetail')} />
            <ExamResultDetailPanel result={result} />
          </>
        )}
      </ResourceView>
    </>
  );
}
