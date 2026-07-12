/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useT } from '@/features/i18n/locale-context';
import type { DiagnosticAssessmentLine, DiagnosticScoreScaleItem } from '@/types/diagnostic-assessment';
import {
  DIAGNOSTIC_PARTICIPATION_OPTIONS,
  applyParticipationToDraft,
  applyScoreToDraft,
  phraseForScore,
  type LineDraftValue,
} from '../utils/diagnostic-draft';

export function DiagnosticEntryGrid({
  lines,
  drafts,
  scoreScale,
  editable,
  onChange,
}: {
  lines: DiagnosticAssessmentLine[];
  drafts: Map<number, LineDraftValue>;
  scoreScale: DiagnosticScoreScaleItem[];
  editable: boolean;
  onChange: (lineId: number, value: LineDraftValue) => void;
}) {
  const t = useT();

  return (
    <div className="diagnostic-grid-wrap">
      <table className="diagnostic-grid">
        <thead>
          <tr>
            <th className="diagnostic-grid__seq">#</th>
            <th className="diagnostic-grid__student">{t('admin.diagnosticAssessment.grid.student')}</th>
            <th>{t('admin.diagnosticAssessment.grid.score')}</th>
            <th>{t('admin.diagnosticAssessment.grid.phrase')}</th>
            <th>{t('admin.diagnosticAssessment.grid.participation')}</th>
            <th>{t('admin.diagnosticAssessment.grid.note')}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const draft = drafts.get(line.id) ?? {
              score: line.score,
              participation_state: line.participation_state,
              teacher_note: line.teacher_note ?? '',
            };
            const phrase =
              draft.participation_state === 'scored'
                ? phraseForScore(draft.score, scoreScale) ?? line.phrase
                : null;

            return (
              <tr key={line.id}>
                <td className="diagnostic-grid__seq">{index + 1}</td>
                <td className="diagnostic-grid__student">
                  <div>{line.student?.name}</div>
                  {line.student?.code ? (
                    <div className="muted text-sm">{line.student.code}</div>
                  ) : null}
                </td>
                <td>
                  <div className="diagnostic-score-pad" role="group" aria-label={t('admin.diagnosticAssessment.grid.score')}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
                      <button
                        key={score}
                        type="button"
                        className={`diagnostic-score-pad__btn${draft.score === score ? ' is-active' : ''}`}
                        disabled={!editable}
                        onClick={() => onChange(line.id, applyScoreToDraft(draft, score))}
                      >
                        {score}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={!editable || draft.score == null}
                      onClick={() => onChange(line.id, applyScoreToDraft(draft, null))}
                    >
                      {t('admin.diagnosticAssessment.grid.clearScore')}
                    </button>
                  </div>
                </td>
                <td className="diagnostic-grid__phrase">{phrase || t('common.dash')}</td>
                <td>
                  <select
                    className="input"
                    disabled={!editable}
                    value={
                      draft.participation_state === 'scored' || draft.score != null
                        ? draft.score != null
                          ? 'scored'
                          : 'not_entered'
                        : draft.participation_state
                    }
                    onChange={(event) =>
                      onChange(line.id, applyParticipationToDraft(draft, event.target.value))
                    }
                  >
                    {DIAGNOSTIC_PARTICIPATION_OPTIONS.map((state) => (
                      <option key={state} value={state}>
                        {t(`admin.diagnosticAssessment.participation.${state}`)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="input diagnostic-note-input"
                    disabled={!editable}
                    value={draft.teacher_note}
                    placeholder={t('admin.diagnosticAssessment.grid.notePlaceholder')}
                    onChange={(event) =>
                      onChange(line.id, { ...draft, teacher_note: event.target.value })
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
