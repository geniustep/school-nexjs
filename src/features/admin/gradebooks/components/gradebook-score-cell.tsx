/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { ParticipationState } from '@/types/gradebook';
import {
  formatScoreDisplay,
  parseScoreInput,
  scoreValidationMessageKey,
} from '../utils/gradebook-score-validation';
import { participationSetsScore } from '../utils/gradebook-entry-draft';

const SPECIAL_PARTICIPATION_STATES: ParticipationState[] = [
  'absent',
  'absent_justified',
  'exempted',
  'not_graded',
];

export function GradebookScoreCell({
  studentLineId,
  cellId,
  maxScore,
  score,
  scoreIsSet,
  participationState,
  editable,
  rowIndex,
  colIndex,
  onChange,
  onNavigate,
}: {
  studentLineId: number;
  cellId: number;
  maxScore: number;
  score: number | null;
  scoreIsSet: boolean;
  participationState: ParticipationState;
  editable: boolean;
  rowIndex: number;
  colIndex: number;
  onChange: (value: {
    score: number | null;
    score_is_set: boolean;
    participation_state: ParticipationState;
  }) => void;
  onNavigate: (rowIndex: number, colIndex: number) => void;
}) {
  const t = useT();
  const menuId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(() =>
    formatScoreDisplay(score, scoreIsSet, participationState),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setLocalValue(formatScoreDisplay(score, scoreIsSet, participationState));
  }, [score, scoreIsSet, participationState]);

  function commitScore(raw: string) {
    const parsed = parseScoreInput(raw, maxScore);
    if (!parsed.valid) {
      if (parsed.reason === 'empty') {
        setValidationError(null);
        onChange({ score: null, score_is_set: false, participation_state: 'not_entered' });
        return;
      }
      setValidationError(t(scoreValidationMessageKey(parsed.reason), { max: maxScore }));
      setLocalValue(formatScoreDisplay(score, scoreIsSet, participationState));
      return;
    }
    setValidationError(null);
    onChange({
      score: parsed.score,
      score_is_set: parsed.scoreIsSet,
      participation_state: 'taken',
    });
  }

  function applyParticipation(state: ParticipationState) {
    setMenuOpen(false);
    setValidationError(null);
    if (participationSetsScore(state)) {
      commitScore(localValue);
      return;
    }
    setLocalValue('');
    onChange({ score: null, score_is_set: false, participation_state: state });
  }

  const stateClass = `gradebook-cell--${participationState}`;
  const readOnly = !editable;

  return (
    <td
      className={`gradebook-cell ${stateClass}${readOnly ? ' gradebook-cell--readonly' : ''}`}
      data-student-line-id={studentLineId}
      data-cell-id={cellId}
    >
      <div className="gradebook-cell__inner">
        {readOnly ? (
          <span
            className="gradebook-cell__readonly-value"
            title={t(`admin.gradebooks.participation.${participationState}`)}
            aria-label={t(`admin.gradebooks.participation.${participationState}`)}
          >
            {participationState !== 'taken' && participationState !== 'not_entered' ? (
              <span className="gradebook-cell__marker" aria-hidden="true">
                {t(`admin.gradebooks.participation.short.${participationState}`)}
              </span>
            ) : (
              formatScoreDisplay(score, scoreIsSet, participationState) || '—'
            )}
          </span>
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              className="gradebook-cell__input"
              data-row={rowIndex}
              data-col={colIndex}
              value={localValue}
              placeholder={maxScore > 0 ? `/${maxScore}` : undefined}
              title={t('admin.gradebooks.cellScoreHint', { max: maxScore })}
              aria-label={t('admin.gradebooks.cellScoreAria', { max: maxScore })}
              onChange={(event) => {
                setLocalValue(event.target.value);
                if (validationError) setValidationError(null);
              }}
              onBlur={() => commitScore(localValue)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitScore(localValue);
                  onNavigate(rowIndex + 1, colIndex);
                } else if (event.key === 'Tab' && !event.shiftKey) {
                  commitScore(localValue);
                }
              }}
            />
            {participationState !== 'taken' && participationState !== 'not_entered' ? (
              <span
                className="gradebook-cell__marker"
                title={t(`admin.gradebooks.participation.${participationState}`)}
                aria-label={t(`admin.gradebooks.participation.${participationState}`)}
              >
                {t(`admin.gradebooks.participation.short.${participationState}`)}
              </span>
            ) : null}
            <button
              type="button"
              className="gradebook-cell__menu-btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              title={t('admin.gradebooks.participation.menu')}
              onClick={() => setMenuOpen((open) => !open)}
            >
              ⋯
            </button>
            {menuOpen ? (
              <div id={menuId} className="gradebook-cell__menu" role="menu">
                {SPECIAL_PARTICIPATION_STATES.map((state) => (
                  <button
                    key={state}
                    type="button"
                    role="menuitem"
                    className="gradebook-cell__menu-item"
                    onClick={() => applyParticipation(state)}
                  >
                    <span className="gradebook-cell__marker" aria-hidden="true">
                      {t(`admin.gradebooks.participation.short.${state}`)}
                    </span>
                    {t(`admin.gradebooks.participation.${state}`)}
                  </button>
                ))}
                <button
                  type="button"
                  role="menuitem"
                  className="gradebook-cell__menu-item"
                  onClick={() => applyParticipation('not_entered')}
                >
                  {t('admin.gradebooks.participation.not_entered')}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
      {validationError ? (
        <span className="gradebook-cell__error tiny" role="alert">
          {validationError}
        </span>
      ) : null}
    </td>
  );
}
