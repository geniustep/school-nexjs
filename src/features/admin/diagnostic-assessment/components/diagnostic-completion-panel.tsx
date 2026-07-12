/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import type { DiagnosticCompletion } from '@/types/diagnostic-assessment';
import { useT } from '@/features/i18n/locale-context';
import { formatAverageScore, formatCompletionPercent } from '../utils/diagnostic-list-present';

export function DiagnosticCompletionPanel({
  completion,
}: {
  completion: DiagnosticCompletion | null | undefined;
}) {
  const t = useT();
  if (!completion) return null;

  return (
    <div>
      <div className="diagnostic-header__stats">
        <div className="diagnostic-header__stat">
          <strong>{formatCompletionPercent(completion.completion_percent)}</strong>
          <span>{t('admin.diagnosticAssessment.stats.completion')}</span>
        </div>
        <div className="diagnostic-header__stat">
          <strong>{formatAverageScore(completion.average_score)}</strong>
          <span>{t('admin.diagnosticAssessment.stats.average')}</span>
        </div>
        <div className="diagnostic-header__stat">
          <strong>
            {completion.resolved_count}/{completion.students_total}
          </strong>
          <span>{t('admin.diagnosticAssessment.stats.resolved')}</span>
        </div>
        <div className="diagnostic-header__stat">
          <strong>{completion.scored_count}</strong>
          <span>{t('admin.diagnosticAssessment.stats.scored')}</span>
        </div>
        <div className="diagnostic-header__stat">
          <strong>{completion.absent_count}</strong>
          <span>{t('admin.diagnosticAssessment.stats.absent')}</span>
        </div>
        <div className="diagnostic-header__stat">
          <strong>{completion.not_entered_count}</strong>
          <span>{t('admin.diagnosticAssessment.stats.notEntered')}</span>
        </div>
      </div>
      <div className="diagnostic-distribution" aria-label={t('admin.diagnosticAssessment.stats.distribution')}>
        {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((score) => (
          <div key={score} className="diagnostic-distribution__chip">
            <strong>{score}</strong>
            <span>{completion.score_distribution?.[score] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
