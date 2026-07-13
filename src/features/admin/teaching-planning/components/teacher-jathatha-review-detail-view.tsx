'use client';

/** @raqeem-design docs/design/RAQEEM-DESIGN.md @design-status adopted */
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Badge, Card, PageHeader, SectionHead } from '@/components/ui/primitives';
import { TeachingPrintLink } from '@/features/teaching-planning/print/components/teaching-print-layout';
import { useToast } from '@/components/ui/toast';
import { markTeacherJathathaReviewed, requestTeacherJathathaCorrection } from '@/features/admin/teaching-planning/api/teacher-jathathas-admin-api';
import { JathathaActivitiesEditor } from '@/features/admin/teaching-planning/components/jathatha-activities-editor';
import { JathathaReadinessPanel } from '@/features/admin/teaching-planning/components/jathatha-readiness-panel';
import { jathathaAllowsAction } from '@/features/admin/teaching-planning/utils/normalize-jathatha';
import { useT } from '@/features/i18n/locale-context';
import type { TeacherJathathaDetail } from '@/types/jathatha';

export function TeacherJathathaReviewDetailView({ item, onReload }: { item: TeacherJathathaDetail; onReload: () => void }) {
  const t = useT(); const toast = useToast(); const router = useRouter();
  const [correctionOpen, setCorrectionOpen] = useState(false); const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false);
  const canReview = jathathaAllowsAction(item, 'mark_reviewed'); const canCorrect = jathathaAllowsAction(item, 'request_correction');
  async function markReviewed() { if (saving) return; setSaving(true); const response = await markTeacherJathathaReviewed(item.id); setSaving(false); if (!response.success) { toast.error(response.error.message); return; } toast.success(t('admin.teachingPlanning.jathatha.review.marked')); onReload(); }
  async function requestCorrection() { if (saving || !reason.trim()) return; setSaving(true); const response = await requestTeacherJathathaCorrection(item.id, { reason: reason.trim() }); setSaving(false); if (!response.success) { toast.error(response.error.message); return; } setCorrectionOpen(false); setReason(''); toast.success(t('admin.teachingPlanning.jathatha.review.correctionRequested')); onReload(); }
  const notes = [['session_objective', item.session_objective], ['materials', item.materials], ['class_adaptation', item.class_adaptation], ['quick_assessment', item.quick_assessment], ['fallback_plan', item.fallback_plan], ['teacher_notes', item.teacher_notes]];
  return <div className="teaching-planning-page"><Link href="/admin/teaching-planning/teacher-jathathas" className="back-link">‹ {t('admin.teachingPlanning.jathatha.review.backToList')}</Link>
    <PageHeader title={item.name ?? t('admin.teachingPlanning.jathatha.review.title')} subtitle={item.teacher?.name ?? t('common.dash')} actions={<div className="teaching-planning-page__actions"><TeachingPrintLink href={`/admin/teaching-planning/teacher-jathathas/${item.id}/print`} />{canReview ? <button type="button" className="btn btn--primary btn--sm" disabled={saving} onClick={() => void markReviewed()}>{t('admin.teachingPlanning.jathatha.review.markReviewed')}</button> : null}{canCorrect ? <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={() => setCorrectionOpen(true)}>{t('admin.teachingPlanning.jathatha.review.requestCorrection')}</button> : null}</div>} />
    <div className="teaching-planning-page__actions"><WorkflowBadge state={item.state} /><WorkflowBadge state={item.review_state} /><Badge tone="slate">{t('admin.teachingPlanning.jathatha.columns.revision')}: <bdi dir="ltr">{item.revision_number}</bdi></Badge></div>
    <Card><SectionHead title={t('admin.teachingPlanning.jathatha.context')} /><dl className="teaching-planning-page__meta-grid">{[['teacher', item.teacher?.name], ['class', item.class?.name], ['subject', item.subject?.name], ['offering', item.offering?.name], ['distributionLine', item.distribution_line?.name], ['sequence', item.sequence?.name], ['template', item.session_template?.name], ['session', [item.session_date, item.session_start_time, item.session_end_time].filter(Boolean).join(' ') || null]].map(([key, value]) => <div key={key}><dt>{t(`admin.teachingPlanning.jathatha.columns.${key}`)}</dt><dd dir="auto">{value || t('common.dash')}</dd></div>)}</dl><dl className="teaching-planning-page__meta-grid">{notes.map(([key, value]) => <div key={key}><dt>{t(`admin.teachingPlanning.jathatha.fields.${key}`)}</dt><dd dir="auto" style={{ whiteSpace: 'pre-wrap' }}>{value || t('common.dash')}</dd></div>)}</dl>{item.correction_reason ? <p dir="auto"><strong>{t('admin.teachingPlanning.jathatha.correctionReason')}:</strong> {item.correction_reason}</p> : null}</Card>
    <Card><SectionHead title={t('admin.teachingPlanning.jathatha.activities.title')} /><JathathaActivitiesEditor value={item.activities} readOnly detailLevel={item.detail_level} showSourcePointers /></Card>
    <JathathaReadinessPanel readiness={item.readiness} blockers={item.blockers} warnings={item.warnings} />
    <Card><SectionHead title={t('admin.teachingPlanning.jathatha.revisions')} /><ul>{(item.revisions ?? []).map((revision) => <li key={revision.id}><bdi dir="ltr">{revision.revision_number}</bdi> — <WorkflowBadge state={revision.state} /> {revision.review_state ? <WorkflowBadge state={revision.review_state} /> : null}</li>)}</ul></Card>
    <ConfirmationDialog open={correctionOpen} size="form" title={t('admin.teachingPlanning.jathatha.review.requestCorrection')} body={<label className="teaching-planning-dialog">{t('admin.teachingPlanning.jathatha.review.reasonRequired')}<textarea required dir="auto" value={reason} onChange={(event) => setReason(event.target.value)} /></label>} confirmLabel={t('admin.teachingPlanning.jathatha.review.requestCorrection')} loading={saving} onConfirm={requestCorrection} onClose={() => setCorrectionOpen(false)} />
  </div>;
}
