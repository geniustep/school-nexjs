'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { ChildSubnav } from '@/features/parent/child-subnav';
import { ChildAcademicActions } from '@/features/parent/child-academic-actions';
import { ExamResultsListPanel } from '@/features/academic/exam-results-list-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ExamResultsListResponse } from '@/types/exam';

export default function ParentChildExamResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useResource<ExamResultsListResponse>(endpoints.parent.childExamResults(id));

  return (
    <>
      <Link href={`/parent/children/${id}`} className="back-link">
        ‹ {t('academic.backToChild')}
      </Link>
      <PageHeader title={t('academic.childResults')} />
      <ChildSubnav id={id} />
      <ChildAcademicActions childId={id} />
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => !d.results?.length}
        empty={
          <EmptyState icon="📊" title={t('empty.results')} description={t('empty.results')} />
        }
      >
        {(data) => (
          <ExamResultsListPanel
            data={data}
            detailHref={(resultId) => `/parent/children/${id}/exam-results/${resultId}`}
          />
        )}
      </ResourceView>
    </>
  );
}
