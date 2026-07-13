'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Teacher read-only Annual Distribution detail with timeline. No mutations.
 * Instructional Item ≠ Calendar Marker (see DistributionTimeline).
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { Badge, Card, InfoBanner, PageHeader, SectionHead } from '@/components/ui/primitives';
import { DistributionTimeline } from '@/features/admin/teaching-planning/components/distribution-timeline';
import {
  fetchTeacherAnnualDistributionTimeline,
} from '@/features/admin/teaching-planning/api/annual-distributions-api';
import { normalizeAnnualDistributionDetail } from '@/features/admin/teaching-planning/utils/normalize-didactic-distribution';
import { distributionItemTypeLabelKey } from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { TeachingPrintLink } from '@/features/teaching-planning/print/components/teaching-print-layout';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useResource } from '@/lib/hooks/use-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { AnnualDistributionTimeline } from '@/types/teaching-planning';
import '@/features/admin/teaching-planning/teaching-planning.css';

export function TeacherAnnualDistributionDetail({ id }: { id: string }) {
  const t = useT();
  const { formatDate } = useFormat();
  const state = useResource(endpoints.teacher.annualDistribution(id));
  const distribution = useMemo(
    () => (state.data ? normalizeAnnualDistributionDetail(state.data) : null),
    [state.data],
  );

  const [timeline, setTimeline] = useState<AnnualDistributionTimeline | null>(null);

  useEffect(() => {
    let active = true;
    fetchTeacherAnnualDistributionTimeline(id).then((res) => {
      if (active && res.success) setTimeline(res.data);
    });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="admin-workspace">
      <ResourceView
        state={{ ...state, data: distribution }}
        loadingLabel={t('common.loading')}
        teacherWorkspace
      >
        {(detail) => (
          <div className="teaching-planning-page">
            <Link href="/teacher/teaching-planning/distributions" className="back-link">
              ‹ {t('admin.teachingPlanning.teacher.backToDistributions')}
            </Link>
            <PageHeader
              title={detail.name}
              subtitle={detail.offering?.display_name ?? undefined}
              actions={
                <TeachingPrintLink
                  href={`/teacher/teaching-planning/distributions/${detail.id}/print`}
                />
              }
            />
            <div className="teaching-planning-page__actions" style={{ marginBottom: '1rem' }}>
              <WorkflowBadge state={detail.state} />
              {detail.active ? (
                <Badge tone="green">
                  {t('admin.teachingPlanning.distributions.activeBadge')}
                </Badge>
              ) : null}
            </div>

            {!detail.active ? (
              <InfoBanner
                tone="blue"
                icon="ℹ"
                title={t('admin.teachingPlanning.teacher.notActiveTitle')}
                description={t('admin.teachingPlanning.teacher.notActiveDesc')}
              />
            ) : null}

            <Card>
              <SectionHead title={t('admin.teachingPlanning.distributions.tabs.lines')} />
              {detail.lines.length === 0 ? (
                <EmptyState
                  compact
                  icon="🗂️"
                  title={t('admin.teachingPlanning.lines.emptyTitle')}
                  description={t('admin.teachingPlanning.lines.emptyDesc')}
                />
              ) : (
                <ol className="tp-lines__read">
                  {detail.lines.map((line) => (
                    <li key={line.id ?? line.order} className="tp-lines__read-item">
                      <span className="tp-templates__order">
                        <bdi dir="ltr">{line.order}</bdi>
                      </span>
                      <strong dir="auto">
                        {line.sequence?.name || line.name || t('common.dash')}
                      </strong>
                      <span className="muted tiny">
                        {t(distributionItemTypeLabelKey(line.item_type))}
                      </span>
                      {line.date_start ? (
                        <span className="muted tiny" dir="ltr">
                          {formatDate(line.date_start)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card>
              <SectionHead title={t('admin.teachingPlanning.distributions.tabs.timeline')} />
              {timeline ? (
                <DistributionTimeline timeline={timeline} />
              ) : (
                <p className="muted">{t('common.loading')}</p>
              )}
            </Card>
          </div>
        )}
      </ResourceView>
    </div>
  );
}
