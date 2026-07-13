'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Teacher read-only list of Annual Distributions. No mutations. A distribution
 * is the year-long instructional plan for an offering — not the timetable.
 */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { normalizeAnnualDistributions } from '@/features/admin/teaching-planning/utils/normalize-didactic-distribution';
import { TeacherAssignmentScopePanel } from '@/features/teacher/academic-context/teacher-assignment-scope-panel';
import { useT } from '@/features/i18n/locale-context';
import { useResource } from '@/lib/hooks/use-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { AnnualDistributionSummary } from '@/types/teaching-planning';
import '@/features/admin/teaching-planning/teaching-planning.css';

export function TeacherAnnualDistributionsList() {
  const t = useT();
  const router = useRouter();
  const state = useResource(endpoints.teacher.annualDistributions);
  const rows = useMemo(() => normalizeAnnualDistributions(state.data), [state.data]);

  const columns: Column<AnnualDistributionSummary>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.teachingPlanning.distributions.columns.name'),
        render: (row) => (
          <div className="teaching-planning-page__title-cell">
            <strong dir="auto">{row.name}</strong>
            {row.offering ? (
              <span className="muted tiny" dir="auto">
                {row.offering.display_name}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'period',
        header: t('admin.teachingPlanning.distributions.columns.period'),
        render: (row) => row.period_label || t('common.dash'),
      },
      {
        key: 'sessions',
        header: t('admin.teachingPlanning.distributions.columns.totals'),
        render: (row) => (
          <Badge tone="blue">
            {t('admin.teachingPlanning.distributions.sessionCount', {
              count: row.totals.total_sessions,
            })}
          </Badge>
        ),
      },
      {
        key: 'state',
        header: t('admin.teachingPlanning.columns.state'),
        render: (row) => (
          <div className="teaching-planning-page__actions">
            <WorkflowBadge state={row.state} />
            {row.active ? (
              <Badge tone="green">{t('admin.teachingPlanning.distributions.activeBadge')}</Badge>
            ) : null}
          </div>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="admin-workspace teaching-planning-page">
      <PageHeader
        title={t('admin.teachingPlanning.teacher.distributionsTitle')}
        subtitle={t('admin.teachingPlanning.teacher.distributionsSubtitle')}
      />
      <TeacherAssignmentScopePanel scope="teaching_planning" />
      <ResourceView
        state={{ ...state, data: rows }}
        loadingLabel={t('common.loading')}
        teacherWorkspace
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            icon="🗓️"
            title={t('admin.teachingPlanning.teacher.distributionsEmptyTitle')}
            description={t('admin.teachingPlanning.teacher.distributionsEmptyDesc')}
          />
        }
      >
        {(data) => (
          <DataTable
            columns={columns}
            rows={data}
            rowKey={(row) => row.id}
            onRowClick={(row) =>
              router.push(`/teacher/teaching-planning/distributions/${row.id}`)
            }
          />
        )}
      </ResourceView>
    </div>
  );
}
