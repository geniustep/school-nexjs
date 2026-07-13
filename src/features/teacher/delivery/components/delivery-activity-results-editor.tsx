'use client';

/**
 * Actual Delivery activity results editor — flat list (no phases), mirrors
 * the reorder-by-button UX from the Jathatha activities editor.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { DELIVERY_ACTIVITY_RESULT_STATES } from '@/types/teaching-delivery';
import type { DeliveryActivityResult, DeliveryActivityResultState } from '@/types/teaching-delivery';
import '@/features/teacher/delivery/delivery.css';

function move<T>(rows: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

function renumber(rows: DeliveryActivityResult[]): DeliveryActivityResult[] {
  return rows.map((row, index) => ({ ...row, sequence_order: index + 1 }));
}

function emptyActivity(order: number): DeliveryActivityResult {
  return {
    sequence_order: order,
    teacher_jathatha_activity_id: null,
    name: '',
    result_state: 'added',
    actual_duration_minutes: null,
    completion_percent: null,
    notes: '',
    active: true,
  };
}

function resultStateLabelKey(state: DeliveryActivityResultState): string {
  return `teacher.delivery.activityResult.${state}`;
}

export function DeliveryActivityResultsEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: DeliveryActivityResult[];
  onChange?: (next: DeliveryActivityResult[]) => void;
  readOnly?: boolean;
}) {
  const t = useT();
  const totalMinutes = useMemo(
    () => value.reduce((sum, item) => sum + (item.actual_duration_minutes ?? 0), 0),
    [value],
  );
  const update = (next: DeliveryActivityResult[]) => onChange?.(renumber(next));
  const updateRow = (index: number, patch: Partial<DeliveryActivityResult>) =>
    update(value.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));

  return (
    <section className="delivery-activities" aria-label={t('teacher.delivery.activities.title')}>
      <div className="between">
        <h3>{t('teacher.delivery.activities.title')}</h3>
        <Badge tone="blue"><bdi dir="ltr">{totalMinutes}</bdi> {t('teacher.delivery.minutes')}</Badge>
      </div>
      {!readOnly && (
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => update([...value, emptyActivity(value.length + 1)])}
        >
          {t('teacher.delivery.activities.add')}
        </button>
      )}
      {value.length === 0 && <p className="muted">{t('teacher.delivery.activities.empty')}</p>}
      <ol className="delivery-activities__list">
        {value.map((activity, index) => (
          <li className="delivery-activities__row" key={activity.id ?? `activity-${index}`}>
            <div className="delivery-activities__head">
              <span className="delivery-activities__order"><bdi dir="ltr">{activity.sequence_order}</bdi></span>
              {!readOnly && (
                <>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    aria-label={t('teacher.delivery.activities.moveUp')}
                    disabled={index === 0}
                    onClick={() => update(move(value, index, -1))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    aria-label={t('teacher.delivery.activities.moveDown')}
                    disabled={index === value.length - 1}
                    onClick={() => update(move(value, index, 1))}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => update(value.filter((_, current) => current !== index))}
                  >
                    {t('common.delete')}
                  </button>
                </>
              )}
            </div>
            <div className="teaching-planning-dialog__row">
              <label>
                {t('teacher.delivery.activities.name')}
                <input
                  dir="auto"
                  readOnly={readOnly}
                  value={activity.name}
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                />
              </label>
              <label>
                {t('teacher.delivery.activities.resultState')}
                <select
                  disabled={readOnly}
                  value={activity.result_state}
                  onChange={(e) => updateRow(index, { result_state: e.target.value })}
                >
                  {DELIVERY_ACTIVITY_RESULT_STATES.map((s) => (
                    <option key={s} value={s}>{t(resultStateLabelKey(s))}</option>
                  ))}
                </select>
              </label>
              <label>
                {t('teacher.delivery.activities.duration')}
                <input
                  dir="ltr"
                  type="number"
                  min={0}
                  readOnly={readOnly}
                  value={activity.actual_duration_minutes ?? ''}
                  onChange={(e) => updateRow(index, {
                    actual_duration_minutes: e.target.value === '' ? null : Number(e.target.value),
                  })}
                />
              </label>
              <label>
                {t('teacher.delivery.activities.percent')}
                <input
                  dir="ltr"
                  type="number"
                  min={0}
                  max={100}
                  readOnly={readOnly}
                  value={activity.completion_percent ?? ''}
                  onChange={(e) => updateRow(index, {
                    completion_percent: e.target.value === '' ? null : Number(e.target.value),
                  })}
                />
              </label>
            </div>
            <label>
              {t('teacher.delivery.activities.notes')}
              <textarea
                dir="auto"
                readOnly={readOnly}
                value={activity.notes ?? ''}
                onChange={(e) => updateRow(index, { notes: e.target.value })}
              />
            </label>
            {!activity.teacher_jathatha_activity_id && activity.result_state === 'added' && (
              <p className="muted tiny">{t('teacher.delivery.activities.addedNoSource')}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
