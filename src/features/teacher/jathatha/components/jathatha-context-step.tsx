'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { createTeacherJathatha, fetchJathathaContext } from '@/features/teacher/jathatha/api/teacher-jathatha-api';
import { useT } from '@/features/i18n/locale-context';
import type { JathathaContextResponse } from '@/types/jathatha';

export function JathathaContextStep({ occurrenceId }: { occurrenceId: string }) {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const [context, setContext] = useState<JathathaContextResponse | null>(null);
  const [error, setError] = useState<any>(null);
  const [lineId, setLineId] = useState<number | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [detailLevel, setDetailLevel] = useState('standard');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    fetchJathathaContext(occurrenceId).then((res) => {
      if (res.success) {
        setContext(res.data);
        if (res.data.current_teacher_jathatha?.id) router.replace(`/teacher/jathathas/${res.data.current_teacher_jathatha.id}`);
      } else setError(res.error);
    });
  }, [occurrenceId, router]);
  if (error) return <ApiErrorView error={error} onRetry={() => setError(null)} />;
  if (!context) return <LoadingState label={t('common.loading')} />;
  const selectedLine = context.candidate_distribution_lines.find((line) => line.id === lineId);
  const templateRequired = selectedLine?.item_type === 'sequence' || Boolean(selectedLine?.sequence);
  const canCreate =
    Boolean(lineId) &&
    (!templateRequired || Boolean(templateId)) &&
    (context.allowed_actions?.create === true ||
      context.allowed_actions?.create_jathatha === true);
  const referenceJathathaId = context.approved_reference_jathatha?.id ?? null;

  async function submit() {
    if (!canCreate || submitting || lineId === null) return;
    setSubmitting(true);
    const res = await createTeacherJathatha({
      session_occurrence_id: Number(occurrenceId),
      distribution_line_id: lineId,
      sequence_session_template_id: templateId,
      reference_jathatha_id: referenceJathathaId,
      detail_level: detailLevel,
    });
    setSubmitting(false);
    if (res.success) router.push(`/teacher/jathathas/${res.data.id}`);
    else toast.error(res.error.message);
  }

  return <section className="card stack">
    <h2>{t('teacher.jathatha.context')}</h2>
    <p className="muted">{[context.occurrence?.class?.name, context.occurrence?.subject?.name, context.assignment?.name, context.offering?.name, context.active_distribution?.name].filter(Boolean).join(' · ')}</p>
    {context.blockers.map((item) => <p className="alert alert--danger" key={item}>{item}</p>)}
    {context.warnings.map((item) => <p className="alert alert--warning" key={item}>{item}</p>)}
    {context.approved_reference_jathatha && <p>{t('teacher.jathatha.approvedReference')}: {context.approved_reference_jathatha.name}</p>}
    <label className="field"><span className="field__label">{t('teacher.jathatha.distributionLine')}</span>
      <select value={lineId ?? ''} onChange={(e) => { setLineId(Number(e.target.value) || null); setTemplateId(null); }} required>
        <option value="">{t('common.select')}</option>
        {context.candidate_distribution_lines.map((line) => <option key={line.id} value={line.id}>{line.name}{line.recommended ? ` (${t('teacher.jathatha.recommended')})` : ''}</option>)}
      </select>
    </label>
    {templateRequired && <label className="field"><span className="field__label">{t('teacher.jathatha.sessionTemplate')}</span>
      <select value={templateId ?? ''} onChange={(e) => setTemplateId(Number(e.target.value) || null)} required>
        <option value="">{t('common.select')}</option>
        {context.candidate_session_templates.filter((template) => !selectedLine?.sequence || template.sequence_id === selectedLine.sequence?.id).map((template) => <option key={template.id} value={template.id}>{template.name}{template.recommended ? ` (${t('teacher.jathatha.recommended')})` : ''}</option>)}
      </select>
    </label>}
    <label className="field"><span className="field__label">{t('teacher.jathatha.detailLevel')}</span>
      <select value={detailLevel} onChange={(e) => setDetailLevel(e.target.value)}>{['compact', 'standard', 'detailed'].map((level) => <option value={level} key={level}>{t(`teacher.jathatha.detail.${level}`)}</option>)}</select>
    </label>
    <button className="btn btn--primary" type="button" disabled={!canCreate || submitting} onClick={() => void submit()}>{submitting ? t('common.submitting') : t('teacher.jathatha.create')}</button>
  </section>;
}
