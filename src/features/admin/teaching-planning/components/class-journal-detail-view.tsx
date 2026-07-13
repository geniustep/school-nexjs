'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Class Teaching Journal entry detail — FULLY read-only.
 * Semantic guard: the journal is generated and read-only; there are no
 * write actions on this page (no edit, no void, no create).
 */

import Link from 'next/link';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { Badge, Card, PageHeader, SectionHead } from '@/components/ui/primitives';
import { TeachingPrintLink } from '@/features/teaching-planning/print/components/teaching-print-layout';
import { useT } from '@/features/i18n/locale-context';
import type { ClassJournalEntryDetail } from '@/types/teaching-delivery';

export function ClassJournalDetailView({ item }: { item: ClassJournalEntryDetail }) {
  const t = useT();

  const contentFields: Array<[string, string | null | undefined]> = [
    ['contentSummary', item.content_summary],
    ['objectiveAchievementSummary', item.objective_achievement_summary],
    ['actualPagesLabel', item.actual_pages_label],
    ['assessmentSummary', item.assessment_summary],
    ['journalText', item.journal_text],
  ];

  return (
    <div className="teaching-planning-page">
      <Link href="/admin/teaching-planning/class-journal" className="back-link">
        ‹ {t('admin.teachingPlanning.classJournal.backToList')}
      </Link>

      <PageHeader
        title={item.delivered_title ?? t('admin.teachingPlanning.classJournal.detailTitle')}
        subtitle={item.teacher?.name ?? t('common.dash')}
        actions={
          <TeachingPrintLink href={`/admin/teaching-planning/class-journal/${item.id}/print`} />
        }
      />

      <div className="teaching-planning-page__actions">
        <WorkflowBadge state={item.state} />
        {item.revision_no != null ? (
          <Badge tone="slate">
            {t('admin.teachingPlanning.jathatha.columns.revision')}: <bdi dir="ltr">{item.revision_no}</bdi>
          </Badge>
        ) : null}
        {item.deviation_type && item.deviation_type !== 'none' ? (
          <Badge tone="amber">{t(`admin.teachingPlanning.delivery.deviationTypes.${item.deviation_type}`)}</Badge>
        ) : null}
      </div>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.delivery.context.title')} />
        <dl className="teaching-planning-page__meta-grid">
          <div>
            <dt>{t('admin.teachingPlanning.jathatha.columns.teacher')}</dt>
            <dd dir="auto">{item.teacher?.name ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.jathatha.columns.class')}</dt>
            <dd dir="auto">{item.class?.name ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.columns.subject')}</dt>
            <dd dir="auto">{item.subject?.name ?? t('common.dash')}</dd>
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
            <dt>{t('admin.teachingPlanning.delivery.columns.session')}</dt>
            <dd dir="auto">
              {[item.session_date, item.session_start_time, item.session_end_time].filter(Boolean).join(' ') ||
                t('common.dash')}
            </dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.delivery.columns.completion')}</dt>
            <dd dir="auto">
              {item.completion_state
                ? t(`admin.teachingPlanning.delivery.completionStates.${item.completion_state}`)
                : t('common.dash')}
              {item.completion_percent != null ? (
                <>
                  {' '}
                  <bdi dir="ltr">({item.completion_percent}%)</bdi>
                </>
              ) : null}
            </dd>
          </div>
        </dl>
        {item.deviation_reason ? (
          <p dir="auto" className="muted">
            {item.deviation_reason}
          </p>
        ) : null}
      </Card>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.classJournal.content.title')} />
        <dl className="teaching-planning-page__meta-grid">
          {contentFields.map(([key, value]) => (
            <div key={key}>
              <dt>{t(`admin.teachingPlanning.delivery.fields.${key}`)}</dt>
              <dd dir="auto" style={{ whiteSpace: 'pre-wrap' }}>
                {value || t('common.dash')}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.classJournal.source.title')} />
        {item.source_delivery ? (
          <Link href={`/admin/teaching-planning/actual-deliveries/${item.source_delivery.id}`} className="btn btn--ghost btn--sm">
            {t('admin.teachingPlanning.classJournal.source.open')}
          </Link>
        ) : (
          <p className="muted">{t('common.dash')}</p>
        )}
        {item.supersedes_id ? (
          <p>
            <Link href={`/admin/teaching-planning/class-journal/${item.supersedes_id}`}>
              {t('admin.teachingPlanning.classJournal.supersedes')}
            </Link>
          </p>
        ) : null}
      </Card>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.delivery.revisions.title')} />
        {(item.revision_lineage ?? []).length === 0 ? (
          <p className="muted">{t('common.dash')}</p>
        ) : (
          <ul>
            {(item.revision_lineage ?? []).map((revision) => (
              <li key={revision.id}>
                <bdi dir="ltr">{revision.revision_no}</bdi> — <WorkflowBadge state={revision.state} />{' '}
                {revision.review_state ? <WorkflowBadge state={revision.review_state} /> : null}
              </li>
            ))}
          </ul>
        )}
        {item.fingerprint ? (
          <p className="muted tiny">
            {t('admin.teachingPlanning.classJournal.fingerprint')}: <bdi dir="ltr">{item.fingerprint}</bdi>
          </p>
        ) : null}
      </Card>
    </div>
  );
}
