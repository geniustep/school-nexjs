'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { AttachmentListIndicator } from '@/components/attachments/attachment-list-indicator';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { Card } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { isVisibleExam } from '@/features/academic/utils';
import type { ExamSummary } from '@/types/exam';

interface ExamListPanelProps {
  allPath: string;
  upcomingPath: string;
  detailHref: (examId: number) => string;
}

export function ExamListPanel({ allPath, upcomingPath, detailHref }: ExamListPanelProps) {
  const t = useT();
  const { formatDate } = useFormat();
  const [tab, setTab] = useState<'all' | 'upcoming'>('all');
  const path = tab === 'upcoming' ? upcomingPath : allPath;
  const state = useResource<ExamSummary[]>(path);

  return (
    <>
      <nav className="tabs" aria-label={t('academic.exams')}>
        <button
          type="button"
          className={cn('tab', tab === 'all' && 'tab--active')}
          onClick={() => setTab('all')}
        >
          {t('academic.all')}
        </button>
        <button
          type="button"
          className={cn('tab', tab === 'upcoming' && 'tab--active')}
          onClick={() => setTab('upcoming')}
        >
          {t('academic.upcoming')}
        </button>
      </nav>
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.filter(isVisibleExam).length === 0}
        empty={
          <EmptyState
            icon="📋"
            title={tab === 'upcoming' ? t('empty.upcomingExams') : t('empty.exams')}
            description={tab === 'upcoming' ? t('empty.upcomingExams') : t('empty.exams')}
          />
        }
      >
        {(items) => {
          const visible = items.filter(isVisibleExam);
          return (
            <div className="grid grid--cards mt-2">
              {visible.map((exam) => (
                <Link key={exam.id} href={detailHref(exam.id)}>
                  <Card className="row-link">
                    <div className="between">
                      <strong>{exam.name}</strong>
                      <WorkflowBadge state={exam.state} />
                    </div>
                    <div className="row mt-2 tiny muted" style={{ gap: 12, flexWrap: 'wrap' }}>
                      {exam.subject?.name && <span>{exam.subject.name}</span>}
                      {exam.exam_date && <span>{formatDate(exam.exam_date)}</span>}
                      {exam.start_time && exam.end_time && (
                        <span>
                          {exam.start_time} – {exam.end_time}
                        </span>
                      )}
                      {exam.is_upcoming && exam.days_left != null && (
                        <span>{t('academic.daysLeft', { count: exam.days_left })}</span>
                      )}
                    </div>
                    <AttachmentListIndicator item={exam} />
                  </Card>
                </Link>
              ))}
            </div>
          );
        }}
      </ResourceView>
    </>
  );
}
