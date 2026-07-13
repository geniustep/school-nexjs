'use client';

import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { Badge, Card, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { JathathaReadiness } from '@/types/jathatha';

export function JathathaReadinessPanel({
  readiness,
  blockers = [],
  warnings = [],
}: {
  readiness?: JathathaReadiness | null;
  blockers?: string[];
  warnings?: string[];
}) {
  const t = useT();
  const allBlockers = [...new Set([...(readiness?.blockers ?? []), ...blockers])];
  const allWarnings = [...new Set([...(readiness?.warnings ?? []), ...warnings])];
  const state = readiness?.ready ? 'ready' : 'not_ready';

  return (
    <Card>
      <SectionHead title={t('admin.teachingPlanning.jathatha.readiness.title')} />
      <div className="teaching-planning-page__actions">
        <WorkflowBadge state={state} />
        <Badge tone={readiness?.ready ? 'green' : 'amber'}>
          {readiness?.ready
            ? t('admin.teachingPlanning.jathatha.readiness.ready')
            : t('admin.teachingPlanning.jathatha.readiness.notReady')}
        </Badge>
      </div>
      {allBlockers.length > 0 ? (
        <>
          <h4>{t('admin.teachingPlanning.jathatha.readiness.blockers')}</h4>
          <ul>{allBlockers.map((item) => <li key={item} dir="auto">{item}</li>)}</ul>
        </>
      ) : null}
      {allWarnings.length > 0 ? (
        <>
          <h4>{t('admin.teachingPlanning.jathatha.readiness.warnings')}</h4>
          <ul>{allWarnings.map((item) => <li key={item} dir="auto">{item}</li>)}</ul>
        </>
      ) : null}
    </Card>
  );
}
