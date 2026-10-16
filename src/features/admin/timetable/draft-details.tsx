'use client';

import { useEffect, useRef, useState } from 'react';
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
const clock = (value: number) => {
  const minutes = Math.round(value * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

/** Read-only draft inspection; never substitutes published slots for draft lines. */
export function DraftDetails({ selection, onClose }: { selection: DraftSelection; onClose: () => void }) {
  const t = useT();
  const heading = useRef<HTMLHeadingElement>(null);
  const [data, setData] = useState<{ lines: Line[]; assignments: Assignment[] } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const { draftId, classId } = selection;
  useEffect(() => {
    let active = true;
    setData(null); setError(false);
    heading.current?.focus();
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

  return <section id="timetable-draft-details" className="timetable-workspace__details" aria-labelledby="timetable-draft-details-title" aria-busy={!data && !error}>
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
          <tbody>{data.lines.map(line => {
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
  </section>;
}
