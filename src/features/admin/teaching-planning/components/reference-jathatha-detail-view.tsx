'use client';

/** @raqeem-design docs/design/RAQEEM-DESIGN.md @design-status adopted */
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Badge, Card, PageHeader, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { approveReferenceJathatha, archiveReferenceJathatha, deleteReferenceJathatha, duplicateReferenceJathathaVersion, resetReferenceJathathaToDraft, submitReferenceJathathaForReview } from '@/features/admin/teaching-planning/api/reference-jathathas-api';
import { JathathaActivitiesEditor } from '@/features/admin/teaching-planning/components/jathatha-activities-editor';
import { JathathaReadinessPanel } from '@/features/admin/teaching-planning/components/jathatha-readiness-panel';
import { ReferenceJathathaEditorDialog } from '@/features/admin/teaching-planning/components/reference-jathatha-dialogs';
import { TeachingPlanningResetDialog } from '@/features/admin/teaching-planning/components/teaching-reference-dialogs';
import { jathathaAllowsAction } from '@/features/admin/teaching-planning/utils/normalize-jathatha';
import { TeachingPrintLink } from '@/features/teaching-planning/print/components/teaching-print-layout';
import { useT } from '@/features/i18n/locale-context';
import type { ReferenceJathathaDetail } from '@/types/jathatha';

export function ReferenceJathathaDetailView({ item, onReload }: { item: ReferenceJathathaDetail; onReload: () => void }) {
  const t = useT(); const toast = useToast(); const router = useRouter();
  const [edit, setEdit] = useState(false); const [reset, setReset] = useState(false); const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null); const [saving, setSaving] = useState(false);
  const allowed = (action: string) => jathathaAllowsAction(item, action);
  async function lifecycle(action: 'submit_for_review' | 'approve' | 'duplicate_version') {
    if (saving) return; setSaving(true);
    const response = await ({ submit_for_review: () => submitReferenceJathathaForReview(item.id), approve: () => approveReferenceJathatha(item.id), duplicate_version: () => duplicateReferenceJathathaVersion(item.id) })[action]();
    setSaving(false); if (!response.success) { toast.error(response.error.message); return; }
    toast.success(t(`admin.teachingPlanning.jathatha.lifecycle.${action}Success`));
    if (action === 'duplicate_version') router.push(`/admin/teaching-planning/reference-jathathas/${response.data.id}`); else onReload();
  }
  async function runConfirm() {
    if (!confirm || saving) return; setSaving(true);
    const response = confirm === 'archive' ? await archiveReferenceJathatha(item.id) : await deleteReferenceJathatha(item.id);
    setSaving(false); if (!response.success) { toast.error(response.error.message); return; }
    if (confirm === 'delete') router.push('/admin/teaching-planning/reference-jathathas'); else onReload(); setConfirm(null);
  }
  const rows = [['objectives', item.objectives], ['prerequisites', item.prerequisites], ['materials_summary', item.materials_summary], ['pages', item.pages], ['quick_assessment_plan', item.quick_assessment_plan], ['fallback_plan', item.fallback_plan], ['expected_difficulties', item.expected_difficulties], ['general_guidance', item.general_guidance], ['correction_elements', item.correction_elements], ['support_activities', item.support_activities], ['notes', item.notes]];
  return <div className="teaching-planning-page"><Link className="back-link" href="/admin/teaching-planning/reference-jathathas">‹ {t('admin.teachingPlanning.jathatha.reference.backToList')}</Link>
    <PageHeader title={item.name} subtitle={item.sequence?.name ?? t('common.dash')} actions={<div className="teaching-planning-page__actions">
      <TeachingPrintLink href={`/admin/teaching-planning/reference-jathathas/${item.id}/print`} />
      {allowed('edit') ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEdit(true)}>{t('common.edit')}</button> : null}
      {allowed('submit_for_review') ? <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={() => void lifecycle('submit_for_review')}>{t('admin.teachingPlanning.lifecycle.submitForReview')}</button> : null}
      {allowed('approve') ? <button type="button" className="btn btn--primary btn--sm" disabled={saving} onClick={() => void lifecycle('approve')}>{t('admin.teachingPlanning.lifecycle.approve')}</button> : null}
      {allowed('reset_to_draft') ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReset(true)}>{t('admin.teachingPlanning.lifecycle.resetToDraft')}</button> : null}
      {allowed('duplicate_version') ? <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={() => void lifecycle('duplicate_version')}>{t('admin.teachingPlanning.lifecycle.duplicateVersion')}</button> : null}
      {allowed('archive') ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirm('archive')}>{t('admin.teachingPlanning.lifecycle.archive')}</button> : null}
      {allowed('delete') ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirm('delete')}>{t('common.delete')}</button> : null}
    </div>} />
    <div className="teaching-planning-page__actions"><WorkflowBadge state={item.state} />{item.version_label ? <Badge tone="slate"><bdi dir="ltr">{item.version_label}</bdi></Badge> : null}</div>
    <Card><SectionHead title={t('admin.teachingPlanning.jathatha.context')} /><dl className="teaching-planning-page__meta-grid"><div><dt>{t('admin.teachingPlanning.fields.reference')}</dt><dd dir="auto">{item.reference?.name ?? t('common.dash')}</dd></div><div><dt>{t('admin.teachingPlanning.jathatha.sequence')}</dt><dd dir="auto">{item.sequence?.name ?? t('common.dash')}</dd></div><div><dt>{t('admin.teachingPlanning.jathatha.template')}</dt><dd dir="auto">{item.session_template?.name ?? t('common.dash')}</dd></div><div><dt>{t('admin.teachingPlanning.jathatha.detailLevel')}</dt><dd>{t(`admin.teachingPlanning.jathatha.detailLevels.${item.default_detail_level}`)}</dd></div></dl><dl className="teaching-planning-page__meta-grid">{rows.map(([key, value]) => <div key={key}><dt>{t(`admin.teachingPlanning.jathatha.fields.${key}`)}</dt><dd dir="auto" style={{ whiteSpace: 'pre-wrap' }}>{value || t('common.dash')}</dd></div>)}</dl></Card>
    <Card><SectionHead title={t('admin.teachingPlanning.jathatha.activities.title')} /><JathathaActivitiesEditor value={item.activities} readOnly detailLevel={item.default_detail_level} showSourcePointers /></Card>
    <JathathaReadinessPanel readiness={item.readiness} blockers={item.blockers} warnings={item.warnings} />
    <Card><SectionHead title={t('admin.teachingPlanning.jathatha.versionHistory')} /><ul>{(item.version_history ?? []).map((version) => <li key={version.id}><bdi dir="ltr">{version.version_label ?? version.id}</bdi> — <WorkflowBadge state={version.state} /></li>)}</ul><p className="muted">{item.approved_by ? `${t('admin.teachingPlanning.jathatha.approvedBy')}: ${item.approved_by.name}` : ''} {item.approved_at ?? ''}</p></Card>
    <ReferenceJathathaEditorDialog open={edit} mode="edit" initial={item} onClose={() => setEdit(false)} onSaved={() => onReload()} />
    <TeachingPlanningResetDialog open={reset} title={t('admin.teachingPlanning.lifecycle.resetToDraft')} onClose={() => setReset(false)} onConfirm={async (reason) => { const response = await resetReferenceJathathaToDraft(item.id, { reason, reset_reason: reason }); if (!response.success) throw new Error(response.error.message); onReload(); }} />
    <ConfirmationDialog open={confirm !== null} title={t(`admin.teachingPlanning.lifecycle.${confirm ?? 'archive'}`)} body={t(`admin.teachingPlanning.jathatha.lifecycle.${confirm ?? 'archive'}Confirm`, { name: item.name })} variant="danger" loading={saving} onConfirm={runConfirm} onClose={() => setConfirm(null)} />
  </div>;
}
