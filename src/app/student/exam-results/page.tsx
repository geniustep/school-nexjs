'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { ExamResultsListPanel } from '@/features/academic/exam-results-list-panel';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ExamResultsListResponse } from '@/types/exam';

export default function StudentExamResultsPage() {
  const t = useT();
  const state = useResource<ExamResultsListResponse>(endpoints.student.examResults);

  return (
    <>
      <Link href="/student/dashboard" className="back-link">
        ‹ {t('academic.backToDashboard')}
      </Link>
      <PageHeader title={t('dashboard.myResults')} />
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
            detailHref={(resultId) => `/student/exam-results/${resultId}`}
          />
        )}
      </ResourceView>
    </>
  );
}
