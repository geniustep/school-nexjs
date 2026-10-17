'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';

type Line = {
  line_id: number; assignment_id: number | false; weekday: string;
  start_time: number; end_time: number;
  warning_messages?: string[]; conflict_messages?: string[];
};
type Assignment = { assignment_id: number; subject_name: string; teacher_name: string };
export type DraftSelection = { draftId: number; classId: number; name: string; warnings: number; conflicts: number };
const weekdayOrder: Record<string, number> = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
const clock = (value: number) => {
  const minutes = Math.round(value * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

/** Read-only draft inspection; never substitutes published slots for draft lines. */
export function DraftDetails({ selection, onClose }: { selection: DraftSelection; onClose: () => void }) {
  const t = useT();
  const heading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<{ lines: Line[]; assignments: Assignment[] } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const { draftId, classId } = selection;
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    const padding = document.body.style.paddingInlineEnd;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    if (gutter > 0) document.body.style.paddingInlineEnd = `${parseFloat(getComputedStyle(document.body).paddingInlineEnd || '0') + gutter}px`;
    document.body.style.overflow = 'hidden';
    heading.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const targets = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], select:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []);
      const first = targets[0], last = targets[targets.length - 1];
      if (!first || !last) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last.focus({ preventScroll: true }); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus({ preventScroll: true }); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingInlineEnd = padding;
      opener?.focus({ preventScroll: true });
    };
  }, [mounted]);
  useEffect(() => {
    let active = true;
    setData(null); setError(false);
    void Promise.all([
      api.get<{ draft: { draft_id: number; class_id: number; lines: Line[] } | null }>(endpoints.admin.classTimetableDraft(classId), { draft_id: draftId }),
      api.get<{ assignments: Assignment[] }>(endpoints.admin.classTimetableAssignments(classId)),
    ]).then(([draft, assignments]) => {
      if (!active) return;
      if (!draft.success || !assignments.success || !draft.data.draft || draft.data.draft.draft_id !== draftId || draft.data.draft.class_id !== classId) {
        setError(true); return;
      }
      setData({ lines: draft.data.draft.lines, assignments: assignments.data.assignments });
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [draftId, classId, retry]);

  if (!mounted) return null;
  return createPortal(<div className="modal-backdrop timetable-workspace__details-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
  <section ref={panel} role="dialog" aria-modal="true" id="timetable-draft-details" className="card modal-panel timetable-workspace__details" aria-labelledby="timetable-draft-details-title" aria-busy={!data && !error}>
    <div className="timetable-workspace__section-head">
      <h2 ref={heading} tabIndex={-1} id="timetable-draft-details-title">{t('timetableWorkspace.details')} · <span dir="auto">{selection.name}</span></h2>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>{t('common.close')}</button>
    </div>
    <p>{t('timetableWorkspace.draftLinesHelp')}</p>
    {!data && !error && <p role="status">{t('common.loading')}</p>}
    {error && <div role="alert"><p>{t('timetableWorkspace.detailsError')}</p><button type="button" className="btn btn--ghost btn--sm" onClick={() => setRetry(value => value + 1)}>{t('timetableWorkspace.retryDetails')}</button></div>}
    {data && <>
      {selection.warnings > 0 && !data.lines.some(line => line.warning_messages?.length) && <p role="status">{t('timetableWorkspace.warningDetailsUnavailable')}</p>}
      {selection.conflicts > 0 && !data.lines.some(line => line.conflict_messages?.length) && <p role="status">{t('timetableWorkspace.conflictDetailsUnavailable')}</p>}
      {!data.lines.length ? <p>{t('timetableWorkspace.noDraftLines')}</p> : <div className="timetable-workspace__details-scroll" tabIndex={0} role="region" aria-label={t('timetableWorkspace.draftLines')}>
        <table>
          <caption>{t('timetableWorkspace.draftLines')}</caption>
          <thead><tr>{['timetableWorkspace.dayLabel', 'academic.time', 'academic.subject', 'academic.teacher', 'timetableWorkspace.warnings', 'timetableWorkspace.conflicts'].map(key => <th scope="col" key={key}>{t(key)}</th>)}</tr></thead>
          <tbody>{[...data.lines].sort((a, b) => (weekdayOrder[a.weekday] ?? 7) - (weekdayOrder[b.weekday] ?? 7) || a.start_time - b.start_time || a.end_time - b.end_time).map(line => {
            const assignment = data.assignments.find(item => item.assignment_id === line.assignment_id);
            return <tr key={line.line_id}>
              <td>{t(`days.${line.weekday}`)}</td>
              <td><span dir="ltr">{clock(line.start_time)}–{clock(line.end_time)}</span></td>
              <td dir="auto">{assignment?.subject_name ?? t('common.dash')}</td>
              <td dir="auto">{assignment?.teacher_name ?? t('common.dash')}</td>
              {[line.warning_messages, line.conflict_messages].map((messages, index) => <td key={index}>{messages?.length ? <ul>{messages.map((message, i) => <li key={i} dir="auto">{message}</li>)}</ul> : t('common.dash')}</td>)}
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </>}
  </section></div>, document.body);
}
