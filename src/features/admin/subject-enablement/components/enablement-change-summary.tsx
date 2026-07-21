'use client';

import { useT } from '@/features/i18n/locale-context';
import type { EnablementChangeSummary } from '../utils/enablement-diff';
import { formatSubjectLabel } from '../utils/build-enablement-matrix';

type Named = { id: number; name: string; code?: string };

export function EnablementChangeSummaryPanel({
  summary,
  resolveLabel,
}: {
  summary: EnablementChangeSummary;
  resolveLabel: (id: number) => Named;
}) {
  const t = useT();
  if (!summary.dirty) return null;

  function list(ids: number[]) {
    return ids.map((id) => {
      const item = resolveLabel(id);
      return formatSubjectLabel({ name: item.name, code: item.code ?? '' });
    });
  }

  return (
    <div className="academic-setup-gap-banner" role="status" data-testid="enablement-change-summary">
      <p>
        <strong>{t('admin.subjectEnablement.saveSummaryTitle')}</strong>
      </p>
      <ul className="col" style={{ gap: 4, marginTop: 8, paddingInlineStart: 18 }}>
        <li>
          {t('admin.subjectEnablement.saveSummaryEnable', { count: summary.enableIds.length })}
          {summary.enableIds.length > 0 ? (
            <span className="tiny muted"> — {list(summary.enableIds).join(' · ')}</span>
          ) : null}
        </li>
        <li>
          {t('admin.subjectEnablement.saveSummaryDisable', { count: summary.disableIds.length })}
          {summary.disableIds.length > 0 ? (
            <span className="tiny muted"> — {list(summary.disableIds).join(' · ')}</span>
          ) : null}
        </li>
        <li className="tiny muted">
          {t('admin.subjectEnablement.saveSummaryUnchanged', {
            count: summary.unchangedIds.length,
          })}
        </li>
      </ul>
    </div>
  );
}
