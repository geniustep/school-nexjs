'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { PageHeader, Card, Badge } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { HomeworkSummary } from '@/types/homework';

export default function StudentHomeworksPage() {
  const t = useT();
  const { formatDate } = useFormat();
  const state = useResource<HomeworkSummary[]>(endpoints.student.homeworks);

  return (
    <>
      <Link href="/student/dashboard" className="back-link">
        ‹ {t('academic.backToDashboard')}
      </Link>
      <PageHeader title={t('dashboard.myHomework')} />
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState icon="📝" title={t('empty.homework')} description={t('empty.homework')} />
        }
      >
        {(items) => (
          <div className="grid grid--cards">
            {items.map((hw) => (
              <Link key={hw.id} href={`/student/homeworks/${hw.id}`}>
                <Card className="row-link">
                  <div className="between">
                    <strong>{hw.name}</strong>
                    <WorkflowBadge state={hw.state} />
                  </div>
                  <div className="row mt-2 tiny muted" style={{ gap: 12, flexWrap: 'wrap' }}>
                    {hw.subject?.name && <span>{hw.subject.name}</span>}
                    {hw.deadline && (
                      <span>
                        {t('academic.deadline')} {formatDate(hw.deadline)}
                      </span>
                    )}
                    {!hw.is_read && <Badge tone="amber">{t('badges.unread')}</Badge>}
                    {hw.submitted && <Badge tone="green">{t('states.submitted')}</Badge>}
                    {hw.is_late && <Badge tone="red">{t('badges.late')}</Badge>}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
