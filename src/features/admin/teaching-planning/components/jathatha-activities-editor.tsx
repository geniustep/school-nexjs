'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  JATHATHA_ACTIVITY_TYPES,
  JATHATHA_PHASE_TYPES,
  type JathathaActivity,
  type JathathaDetailLevel,
  type JathathaPhase,
} from '@/types/jathatha';
import { jathathaActivityTypeLabelKey, jathathaPhaseTypeLabelKey } from '../utils/jathatha-present';

const text = (value: string | null | undefined) => value ?? '';
const minutes = (value: number | null | undefined) => value ?? 0;

function renumberActivities(rows: JathathaActivity[]): JathathaActivity[] {
  return rows.map((row, index) => ({
    ...row,
    sequence_order: index + 1,
    phases: row.phases.map((phase, phaseIndex) => ({ ...phase, sequence_order: phaseIndex + 1 })),
  }));
}

function move<T>(rows: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

function emptyPhase(order: number): JathathaPhase {
  return { sequence_order: order, phase_type: 'action' };
}

function emptyActivity(order: number): JathathaActivity {
  return { sequence_order: order, name: '', activity_type: 'situation', phases: [] };
}

export function JathathaActivitiesEditor({
  value,
  onChange,
  readOnly = false,
  detailLevel,
  showSourcePointers = false,
}: {
  value: JathathaActivity[];
  onChange?: (next: JathathaActivity[]) => void;
  readOnly?: boolean;
  detailLevel: JathathaDetailLevel;
  showSourcePointers?: boolean;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set(value.map((_, index) => index)));
  const total = useMemo(() => value.reduce((sum, item) => sum + minutes(item.planned_duration_minutes), 0), [value]);
  const update = (next: JathathaActivity[]) => onChange?.(renumberActivities(next));
  const updateActivity = (index: number, patch: Partial<JathathaActivity>) =>
    update(value.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  const updatePhase = (activityIndex: number, phaseIndex: number, patch: Partial<JathathaPhase>) =>
    update(value.map((activity, index) => index !== activityIndex ? activity : {
      ...activity,
      phases: activity.phases.map((phase, current) => current === phaseIndex ? { ...phase, ...patch } : phase),
    }));
  const toggle = (index: number) => setExpanded((previous) => {
    const next = new Set(previous);
    if (next.has(index)) next.delete(index); else next.add(index);
    return next;
  });

  return (
    <section className="jathatha-editor" aria-label={t('admin.teachingPlanning.jathatha.activities.title')}>
      <div className="between">
        <h3>{t('admin.teachingPlanning.jathatha.activities.title')}</h3>
        <Badge tone="blue"><bdi dir="ltr">{total}</bdi> {t('admin.teachingPlanning.jathatha.minutes')}</Badge>
      </div>
      {!readOnly ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => update([...value, emptyActivity(value.length + 1)])}>{t('admin.teachingPlanning.jathatha.activities.add')}</button> : null}
      {value.length === 0 ? <p className="muted">{t('admin.teachingPlanning.jathatha.activities.empty')}</p> : null}
      <ol className="jathatha-editor__list">
        {value.map((activity, activityIndex) => {
          const phaseTotal = activity.phases.reduce((sum, phase) => sum + minutes(phase.planned_duration_minutes), 0);
          const exceeds = phaseTotal > minutes(activity.planned_duration_minutes);
          const open = expanded.has(activityIndex);
          return (
            <li className="jathatha-editor__activity" key={activity.id ?? `activity-${activityIndex}`}>
              <div className="jathatha-editor__head">
                <span className="jathatha-editor__order"><bdi dir="ltr">{activity.sequence_order}</bdi></span>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggle(activityIndex)} aria-expanded={open}>
                  {open ? t('admin.teachingPlanning.jathatha.activities.collapse') : t('admin.teachingPlanning.jathatha.activities.expand')}
                </button>
                {!readOnly ? <>
                  <button type="button" className="btn btn--ghost btn--sm" aria-label={t('admin.teachingPlanning.reorder.moveUp')} disabled={activityIndex === 0} onClick={() => update(move(value, activityIndex, -1))}>↑</button>
                  <button type="button" className="btn btn--ghost btn--sm" aria-label={t('admin.teachingPlanning.reorder.moveDown')} disabled={activityIndex === value.length - 1} onClick={() => update(move(value, activityIndex, 1))}>↓</button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => update(value.filter((_, index) => index !== activityIndex))}>{t('common.delete')}</button>
                </> : null}
              </div>
              {open ? <div className="jathatha-editor__body">
                <div className="teaching-planning-dialog__row">
                  <label>{t('admin.teachingPlanning.jathatha.activities.name')}<input dir="auto" readOnly={readOnly} value={activity.name} onChange={(event) => updateActivity(activityIndex, { name: event.target.value })} /></label>
                  <label>{t('admin.teachingPlanning.jathatha.activities.type')}<select disabled={readOnly} value={activity.activity_type} onChange={(event) => updateActivity(activityIndex, { activity_type: event.target.value })}>{JATHATHA_ACTIVITY_TYPES.map((type) => <option key={type} value={type}>{t(jathathaActivityTypeLabelKey(type))}</option>)}</select></label>
                  <label>{t('admin.teachingPlanning.jathatha.activities.duration')}<input dir="ltr" type="number" min={0} readOnly={readOnly} value={activity.planned_duration_minutes ?? ''} onChange={(event) => updateActivity(activityIndex, { planned_duration_minutes: event.target.value === '' ? null : Number(event.target.value) })} /></label>
                </div>
                <label>{t('admin.teachingPlanning.jathatha.activities.objective')}<textarea dir="auto" readOnly={readOnly} value={text(activity.partial_objective)} onChange={(event) => updateActivity(activityIndex, { partial_objective: event.target.value })} /></label>
                {detailLevel !== 'compact' ? <><label>{t('admin.teachingPlanning.jathatha.activities.instructions')}<textarea dir="auto" readOnly={readOnly} value={text(activity.instructions)} onChange={(event) => updateActivity(activityIndex, { instructions: event.target.value })} /></label><label>{t('admin.teachingPlanning.jathatha.activities.materials')}<textarea dir="auto" readOnly={readOnly} value={text(activity.materials)} onChange={(event) => updateActivity(activityIndex, { materials: event.target.value })} /></label></> : null}
                {showSourcePointers && activity.source_activity_id ? <p className="muted tiny">{t('admin.teachingPlanning.jathatha.activities.source')}: <bdi dir="ltr">{activity.source_activity_id}</bdi></p> : null}
                <div className="between"><h4>{t('admin.teachingPlanning.jathatha.phases.title')}</h4><span className="muted tiny"><bdi dir="ltr">{phaseTotal}</bdi> {t('admin.teachingPlanning.jathatha.minutes')}</span></div>
                {exceeds ? <p className="jathatha-editor__warning" role="status">{t('admin.teachingPlanning.jathatha.phases.durationExceedsActivity')}</p> : null}
                <ol className="jathatha-editor__phases">
                  {activity.phases.map((phase, phaseIndex) => <li key={phase.id ?? `phase-${phaseIndex}`} className="jathatha-editor__phase">
                    <div className="jathatha-editor__head"><span className="jathatha-editor__order"><bdi dir="ltr">{phase.sequence_order}</bdi></span>{!readOnly ? <><button type="button" className="btn btn--ghost btn--sm" aria-label={t('admin.teachingPlanning.reorder.moveUp')} disabled={phaseIndex === 0} onClick={() => update(value.map((row, index) => index !== activityIndex ? row : { ...row, phases: move(row.phases, phaseIndex, -1) }))}>↑</button><button type="button" className="btn btn--ghost btn--sm" aria-label={t('admin.teachingPlanning.reorder.moveDown')} disabled={phaseIndex === activity.phases.length - 1} onClick={() => update(value.map((row, index) => index !== activityIndex ? row : { ...row, phases: move(row.phases, phaseIndex, 1) }))}>↓</button><button type="button" className="btn btn--ghost btn--sm" onClick={() => update(value.map((row, index) => index !== activityIndex ? row : { ...row, phases: row.phases.filter((_, current) => current !== phaseIndex) }))}>{t('common.delete')}</button></> : null}</div>
                    <div className="teaching-planning-dialog__row"><label>{t('admin.teachingPlanning.jathatha.phases.type')}<select disabled={readOnly} value={phase.phase_type} onChange={(event) => updatePhase(activityIndex, phaseIndex, { phase_type: event.target.value })}>{JATHATHA_PHASE_TYPES.map((type) => <option key={type} value={type}>{t(jathathaPhaseTypeLabelKey(type))}</option>)}</select></label><label>{t('admin.teachingPlanning.jathatha.activities.duration')}<input dir="ltr" type="number" min={0} readOnly={readOnly} value={phase.planned_duration_minutes ?? ''} onChange={(event) => updatePhase(activityIndex, phaseIndex, { planned_duration_minutes: event.target.value === '' ? null : Number(event.target.value) })} /></label></div>
                    <label>{t('admin.teachingPlanning.jathatha.phases.instruction')}<textarea dir="auto" readOnly={readOnly} value={text(phase.instruction)} onChange={(event) => updatePhase(activityIndex, phaseIndex, { instruction: event.target.value })} /></label>
                    {detailLevel === 'detailed' ? <label>{t('admin.teachingPlanning.jathatha.phases.teacherActivity')}<textarea dir="auto" readOnly={readOnly} value={text(phase.teacher_activity)} onChange={(event) => updatePhase(activityIndex, phaseIndex, { teacher_activity: event.target.value })} /></label> : null}
                  </li>)}
                </ol>
                {!readOnly ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => update(value.map((row, index) => index !== activityIndex ? row : { ...row, phases: [...row.phases, emptyPhase(row.phases.length + 1)] }))}>{t('admin.teachingPlanning.jathatha.phases.add')}</button> : null}
              </div> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
