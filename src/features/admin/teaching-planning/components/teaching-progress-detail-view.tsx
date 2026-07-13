'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Teaching Progress line detail — FULLY read-only.
 * Semantic guard: progress is derived and read-only. No write controls,
 * no client-side recomputation of coverage or status.
 */

import Link from 'next/link';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { Badge, Card, PageHeader, SectionHead } from '@/components/ui/primitives';
import { TeachingPrintLink } from '@/features/teaching-planning/print/components/teaching-print-layout';
import { useT } from '@/features/i18n/locale-context';
import type { TeachingProgressLineDetail } from '@/types/teaching-delivery';

export function TeachingProgressDetailView({ item }: { item: TeachingProgressLineDetail }) {
  const t = useT();

  return (
    <div className="teaching-planning-page">
      <Link href="/admin/teaching-planning/progress" className="back-link">
        ‹ {t('admin.teachingPlanning.progress.backToList')}
      </Link>

      <PageHeader
        title={item.title ?? item.name ?? t('admin.teachingPlanning.progress.detailTitle')}
        subtitle={item.class?.name ?? t('common.dash')}
        actions={
          <TeachingPrintLink href={`/admin/teaching-planning/progress/${item.id}/print`} />
        }
      />

      <div className="teaching-planning-page__actions">
        <WorkflowBadge state={item.status} />
        {item.delayed ? <Badge tone="red">{t('admin.teachingPlanning.progress.delayed')}</Badge> : null}
      </div>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.delivery.context.title')} />
        <dl className="teaching-planning-page__meta-grid">
          <div>
            <dt>{t('admin.teachingPlanning.jathatha.columns.class')}</dt>
            <dd dir="auto">{item.class?.name ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.columns.subject')}</dt>
            <dd dir="auto">{item.subject?.name ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.jathatha.columns.teacher')}</dt>
            <dd dir="auto">{item.teacher?.name ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.jathatha.columns.offering')}</dt>
            <dd dir="auto">{item.offering?.name ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.jathatha.columns.distributionLine')}</dt>
            <dd dir="auto">{item.distribution_line?.name ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.progress.columns.coverage')}</dt>
            <dd>
              <bdi dir="ltr">{item.coverage_percent != null ? `${item.coverage_percent}%` : t('common.dash')}</bdi>
            </dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.progress.columns.delivered')}</dt>
            <dd>
              <bdi dir="ltr">
                {item.delivered_units ?? 0}/{item.planned_sessions ?? t('common.dash')}
              </bdi>
            </dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.progress.fields.remainingUnits')}</dt>
            <dd>
              <bdi dir="ltr">{item.remaining_units ?? t('common.dash')}</bdi>
            </dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.delivery.fields.plannedWindow')}</dt>
            <dd dir="auto">
              {[item.planned_window_start, item.planned_window_end].filter(Boolean).join(' → ') || t('common.dash')}
            </dd>
          </div>
        </dl>
        {item.delayed_explanation ? (
          <p dir="auto" className="muted">
            {item.delayed_explanation}
          </p>
        ) : null}
      </Card>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.progress.contributingDeliveries.title')} />
        {(item.contributing_deliveries ?? []).length === 0 ? (
          <p className="muted">{t('admin.teachingPlanning.progress.contributingDeliveries.empty')}</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {(item.contributing_deliveries ?? []).map((delivery) => (
              <li key={delivery.id} className="between" style={{ padding: '0.5rem 0' }}>
                <Link href={`/admin/teaching-planning/actual-deliveries/${delivery.id}`} dir="auto">
                  {delivery.delivered_title ?? delivery.session_date ?? t('common.dash')}
                </Link>
                <WorkflowBadge state={delivery.state} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {(item.planned_dates ?? []).length > 0 ? (
        <Card>
          <SectionHead title={t('admin.teachingPlanning.progress.plannedDates.title')} />
          <ul>
            {(item.planned_dates ?? []).map((date) => (
              <li key={date}>
                <bdi dir="ltr">{date}</bdi>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
