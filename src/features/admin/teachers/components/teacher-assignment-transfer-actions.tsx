'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import type { TeachingAssignment } from '@/types/academic-setup';
import './teacher-assignment-transfer-actions.css';

type Action = 'end' | 'replace';
type Choice = { assignment: TeachingAssignment; action: Action };
type Result = { action?: string; warnings?: { code?: string; message?: string }[] };
const roles = {
  main: ['رئيسي', 'Principal'],
  assistant: ['مساعد', 'Assistant'],
  substitute: ['بديل', 'Remplaçant'],
  co_teacher: ['مشارك', 'Co-enseignant'],
};

export function TeacherAssignmentTransferActions({ teacherId, academicYearId, canManage }: {
  teacherId: number; academicYearId: number; canManage: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const fr = String(t('common.save')).toLowerCase().includes('enregistrer');
  const labels = fr ? {
    title: 'Affectations existantes', desc: 'Terminez une affectation ou remplacez son enseignant sans effacer son historique.',
    end: 'Terminer', replace: 'Remplacer par cet enseignant', teacher: 'Enseignant', role: 'Rôle',
    reason: 'Motif', endDate: 'Dernier jour', startDate: 'Début de la nouvelle affectation',
    confirm: 'Confirmer', cancel: 'Annuler', pending: 'Traitement…',
    unavailable: 'Ces actions seront disponibles après activation du nouveau contrat côté serveur.',
    empty: 'Aucune affectation active d’un autre enseignant.', error: 'Impossible de charger les affectations.',
    retry: 'Réessayer', reasonRequired: 'Indiquez un motif.', dateRequired: 'Choisissez une date.',
    success: 'Affectation mise à jour.', failed: 'Opération non effectuée.',
  } : {
    title: 'إسنادات المواد والأقسام الحالية', desc: 'أنهِ إسناد أستاذ آخر أو استبدله مباشرة، مع الحفاظ على السجل التاريخي.',
    end: 'إنهاء الإسناد', replace: 'استبداله بهذا الأستاذ', teacher: 'الأستاذ', role: 'الدور',
    reason: 'سبب الإجراء', endDate: 'آخر يوم للإسناد', startDate: 'بداية إسناد الأستاذ الجديد',
    confirm: 'تأكيد', cancel: 'إلغاء', pending: 'جار التنفيذ…',
    unavailable: 'تتاح هذه الإجراءات بعد تفعيل عقد الإسناد الجديد على الخادم.',
    empty: 'لا توجد إسنادات نشطة لأساتذة آخرين.', error: 'تعذر تحميل الإسنادات.',
    retry: 'إعادة المحاولة', reasonRequired: 'يرجى إدخال السبب.', dateRequired: 'يرجى تحديد التاريخ.',
    success: 'تم تحديث الإسناد.', failed: 'لم تُنفّذ العملية.',
  };
  const assignments = useAdminResource<TeachingAssignment[]>(endpoints.admin.teachingAssignments, {
    academic_year_id: academicYearId, operationally_active: 1, page_size: 500,
  });
  const [choice, setChoice] = useState<Choice | null>(null);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const rows = useMemo(() => (assignments.data ?? []).filter((a) =>
    a.active && a.state === 'active' && a.teacher?.id !== teacherId,
  ).sort((a, b) => a.class.name.localeCompare(b.class.name) || a.subject.name.localeCompare(b.subject.name)), [assignments.data, teacherId]);

  // Legacy runtimes may support /end but not the new atomic /replace.
  const supported = (assignments.data ?? []).some((a) => {
    const actions = a.allowed_actions;
    return actions && !Array.isArray(actions) && Object.prototype.hasOwnProperty.call(actions, 'replace');
  });
  const allowed = (a: TeachingAssignment, action: Action) => {
    const actions = a.allowed_actions;
    return canManage && supported && !busy && !assignments.loading &&
      Boolean(actions && !Array.isArray(actions) && actions[action] === true);
  };
  const open = (assignment: TeachingAssignment, action: Action) => {
    if (!allowed(assignment, action)) return;
    setChoice({ assignment, action }); setReason(''); setDate(''); setError('');
  };
  const submit = async () => {
    if (!choice || busy || !allowed(choice.assignment, choice.action)) return;
    if (!reason.trim()) { setError(labels.reasonRequired); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError(labels.dateRequired); return; }
    setBusy(true); setError('');
    const { assignment, action } = choice;
    // Exactly one backend mutation, never DELETE or client-side end+create.
    const body = action === 'end'
      ? { reason: reason.trim(), effective_to: date }
      : { reason: reason.trim(), effective_from: date, new_teacher_id: teacherId, role: assignment.role };
    const result = await api.post<Result>(`${endpoints.admin.teachingAssignments}/${assignment.id}/${action}`, body);
    setBusy(false);
    if (!result.success) { setError(result.error?.message || labels.failed); return; }
    setChoice(null); await assignments.reload(); toast.success(labels.success);
    const warnings = result.data?.warnings ?? [];
    if (warnings.length) toast.error(warnings.map((w) => w.message || w.code).filter(Boolean).join(' • '));
  };
  return <section className="teacher-assignment-transfer" aria-label={labels.title}>
    <header><h3>{labels.title}</h3><p className="tiny muted">{labels.desc}</p></header>
    {assignments.loading ? <p className="muted">{t('common.loading')}</p> : null}
    {assignments.error ? <div role="alert" className="teacher-assignment-transfer__notice">{labels.error}{' '}
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => assignments.reload()}>{labels.retry}</button>
    </div> : null}
    {!assignments.loading && !assignments.error && !supported ?
      <p className="teacher-assignment-transfer__notice" role="status">{labels.unavailable}</p> : null}
    {!assignments.loading && !assignments.error && rows.length === 0 ? <p className="muted">{labels.empty}</p> : null}
    {!assignments.error ? <div className="teacher-assignment-transfer__list">{rows.map((a) =>
      <article className="teacher-assignment-transfer__item" key={a.id}>
        <div className="teacher-assignment-transfer__details">
          <strong dir="auto">{a.class.name} · {a.subject.name}</strong>
          <span dir="auto">{labels.teacher}: {a.teacher.name}</span>
          <span className="tiny muted">{labels.role}: {roles[a.role][fr ? 1 : 0]}</span>
        </div>
        <div className="teacher-assignment-transfer__actions">
          <button type="button" className="btn btn--ghost btn--sm" disabled={!allowed(a, 'end')} onClick={() => open(a, 'end')}>{labels.end}</button>
          <button type="button" className="btn btn--primary btn--sm" disabled={!allowed(a, 'replace')} onClick={() => open(a, 'replace')}>{labels.replace}</button>
        </div>
      </article>)}</div> : null}
    {choice ? <div className="teacher-assignment-transfer__dialog" role="dialog" aria-modal="true" aria-label={labels[choice.action]}>
      <div className="teacher-assignment-transfer__dialog-inner">
        <h3>{labels[choice.action]}</h3>
        <p dir="auto"><strong>{choice.assignment.teacher.name}</strong> — {choice.assignment.subject.name} — {choice.assignment.class.name}</p>
        <label className="teacher-assignment-transfer__field">{labels.reason}
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} required />
        </label>
        <label className="teacher-assignment-transfer__field">{choice.action === 'end' ? labels.endDate : labels.startDate}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={busy} required />
        </label>
        {error ? <p className="teacher-assignment-transfer__notice" role="alert">{error}</p> : null}
        <div className="teacher-assignment-transfer__actions">
          <button className="btn btn--ghost btn--sm" type="button" disabled={busy} onClick={() => setChoice(null)}>{labels.cancel}</button>
          <button className="btn btn--primary btn--sm" type="button" disabled={busy || !reason.trim() || !date} onClick={() => void submit()}>{busy ? labels.pending : labels.confirm}</button>
        </div>
      </div>
    </div> : null}
  </section>;
}
