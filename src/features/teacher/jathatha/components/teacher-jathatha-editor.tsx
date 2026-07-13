'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { JathathaActivitiesEditor } from '@/features/teacher/jathatha/components/jathatha-activities-editor';
import { confirmTeacherJathatha, createTeacherJathathaCorrection, fetchTeacherJathatha, markTeacherJathathaReady, resetTeacherJathathaToDraft, updateTeacherJathatha, voidTeacherJathatha } from '@/features/teacher/jathatha/api/teacher-jathatha-api';
import { TeacherPageHeader, TeacherWorkspaceCard } from '@/features/teacher/ui/teacher-primitives';
import { TeachingPrintLink } from '@/features/teaching-planning/print/components/teaching-print-layout';
import { useT } from '@/features/i18n/locale-context';
import type { TeacherJathathaDetail, TeacherJathathaUpdatePayload } from '@/types/jathatha';

const fields: (keyof TeacherJathathaUpdatePayload)[] = ['session_objective', 'materials', 'class_adaptation', 'quick_assessment', 'fallback_plan', 'teacher_notes'];

export function TeacherJathathaEditor({ jathathaId }: { jathathaId: string }) {
  const t = useT(); const router = useRouter(); const search = useSearchParams(); const toast = useToast();
  const [data, setData] = useState<TeacherJathathaDetail | null>(null);
  const [draft, setDraft] = useState<TeacherJathathaUpdatePayload>({});
  const [error, setError] = useState<any>(null); const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<'confirm' | 'correction' | 'void' | null>(search.get('action') === 'correction' ? 'correction' : null);
  const [reason, setReason] = useState('');
  const load = () => fetchTeacherJathatha(jathathaId).then((res) => {
    if (res.success) { setData(res.data); setDraft(Object.fromEntries(fields.map((key) => [key, res.data[key] ?? '']))); }
    else setError(res.error);
  });
  useEffect(() => { load(); }, [jathathaId]);
  if (error) return <ApiErrorView error={error} onRetry={load} />;
  if (!data) return <LoadingState label={t('common.loading')} />;
  const current = data;
  const editable = Boolean(current.allowed_actions?.edit) && ['draft', 'ready'].includes(current.state);
  const dirty = JSON.stringify({ ...draft, activities: draft.activities ?? current.activities, attachment_ids: draft.attachment_ids ?? current.attachment_ids }) !== JSON.stringify({ ...Object.fromEntries(fields.map((key) => [key, current[key] ?? ''])), activities: current.activities, attachment_ids: current.attachment_ids });
  async function save() {
    if (!editable || saving) return; setSaving(true);
    const res = await updateTeacherJathatha(jathathaId, { ...draft, activities: draft.activities ?? current.activities, attachment_ids: draft.attachment_ids ?? current.attachment_ids });
    setSaving(false); if (res.success) { setData(res.data); setDraft(Object.fromEntries(fields.map((key) => [key, res.data[key] ?? '']))); toast.success(t('teacher.jathatha.saveSuccess')); } else toast.error(res.error.message);
  }
  async function lifecycle() {
    if (!dialog || (['correction', 'void'].includes(dialog) && !reason.trim())) return;
    const action = dialog === 'confirm' ? confirmTeacherJathatha(jathathaId) : dialog === 'correction' ? createTeacherJathathaCorrection(jathathaId, { reason }) : voidTeacherJathatha(jathathaId, { reason });
    const res = await action; if (res.success) { setDialog(null); setReason(''); if (dialog === 'correction') router.push(`/teacher/jathathas/${res.data.id}`); else { setData(res.data); load(); } } else toast.error(res.error.message);
  }
  return <div className="teacher-workspace">
    <TeacherPageHeader title={data.name ?? t('teacher.jathatha.title')} subtitle={[data.session_date, data.session_start_time, data.class?.name, data.subject?.name, data.detail_level, data.reference_jathatha?.name].filter(Boolean).join(' · ')} />
    <div className="row mb-2"><TeachingPrintLink href={`/teacher/jathathas/${data.id}/print`} /><WorkflowBadge state={data.state} /><WorkflowBadge state={data.review_state} /><span>{t('teacher.jathatha.revision', { number: data.revision_number })}</span></div>
    {data.review_state === 'correction_requested' && <div className="alert alert--warning">{data.correction_reason}<button className="btn btn--sm" onClick={() => setDialog('correction')}>{t('teacher.jathatha.createCorrection')}</button></div>}
    {data.review_state === 'reviewed' && <WorkflowBadge state="reviewed" />}
    <TeacherWorkspaceCard title={t('teacher.jathatha.editor')}>
      <div className="stack">{fields.map((field) => <label className="field" key={field}><span className="field__label">{t(`teacher.jathatha.${field}`)}</span><textarea disabled={!editable} value={(draft[field] as string) ?? ''} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} /></label>)}
      <label className="field"><span className="field__label">{t('teacher.jathatha.detailLevel')}</span><select disabled={!editable} value={draft.detail_level ?? data.detail_level} onChange={(e) => setDraft({ ...draft, detail_level: e.target.value })}>{['compact', 'standard', 'detailed'].map((level) => <option key={level}>{level}</option>)}</select></label>
      <JathathaActivitiesEditor
        readOnly={!editable}
        detailLevel={draft.detail_level ?? data.detail_level}
        showSourcePointers
        value={draft.activities ?? data.activities}
        onChange={(activities) => setDraft({ ...draft, activities })}
      />
      <p className="muted">{t('teacher.jathatha.attachmentsReadOnly')}</p>
      <p>{t('teacher.jathatha.readiness')}: {data.readiness?.ready ? t('common.yes') : t('common.no')}</p>
      {editable && <button className="btn btn--primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? t('common.saving') : t('common.save')}</button>}</div>
    </TeacherWorkspaceCard>
    <div className="row mt-2">{data.allowed_actions?.mark_ready && <button className="btn btn--primary" onClick={async () => { const res = await markTeacherJathathaReady(jathathaId); if (res.success) { setData(res.data); load(); } else toast.error(res.error.message); }}>{t('teacher.jathatha.markReady')}</button>}{data.allowed_actions?.reset_to_draft && <button className="btn btn--ghost" onClick={async () => { const res = await resetTeacherJathathaToDraft(jathathaId); if (res.success) { setData(res.data); load(); } else toast.error(res.error.message); }}>{t('teacher.jathatha.resetDraft')}</button>}{data.allowed_actions?.confirm && <button className="btn btn--primary" onClick={() => setDialog('confirm')}>{t('common.confirm')}</button>}{data.allowed_actions?.create_correction && <button className="btn btn--ghost" onClick={() => setDialog('correction')}>{t('teacher.jathatha.createCorrection')}</button>}{data.allowed_actions?.void && <button className="btn btn--danger" onClick={() => setDialog('void')}>{t('teacher.jathatha.void')}</button>}</div>
    <TeacherWorkspaceCard title={t('teacher.jathatha.revisions')}><ul>{data.revisions?.map((revision) => <li key={revision.id}>#{revision.revision_number} · <WorkflowBadge state={revision.state} /> · {revision.correction_reason}</li>)}</ul></TeacherWorkspaceCard>
    <ConfirmationDialog open={dialog !== null} title={t(`teacher.jathatha.${dialog ?? 'confirm'}`)} body={dialog === 'confirm' ? t('teacher.jathatha.confirmImmutable') : <textarea value={reason} onChange={(e) => setReason(e.target.value)} required placeholder={t('teacher.jathatha.reasonRequired')} />} onConfirm={lifecycle} onClose={() => setDialog(null)} variant={dialog === 'void' ? 'danger' : 'primary'} />
  </div>;
}
