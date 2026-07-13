'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Didactic Sequence detail. Session rows below are TEMPLATES (the plan), not
 * scheduled/actual sessions and not a Jathatha.
 */

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Badge, Card, PageHeader, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import {
  approveDidacticSequence,
  archiveDidacticSequence,
  deleteDidacticSequence,
  duplicateDidacticSequenceVersion,
  resetDidacticSequenceToDraft,
  submitDidacticSequenceForReview,
} from '@/features/admin/teaching-planning/api/didactic-sequences-api';
import { DidacticSequenceEditorDialog } from '@/features/admin/teaching-planning/components/didactic-sequence-dialogs';
import { TeachingPlanningResetDialog } from '@/features/admin/teaching-planning/components/teaching-reference-dialogs';
import { teachingPlanningAllowsAction } from '@/features/admin/teaching-planning/utils/normalize-teaching-planning';
import { sessionTypeLabelKey } from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { useT } from '@/features/i18n/locale-context';
import type { DidacticSequenceDetail } from '@/types/teaching-planning';
import '@/features/admin/teaching-planning/teaching-planning.css';

export function DidacticSequenceDetailView({
  sequence,
  onReload,
}: {
  sequence: DidacticSequenceDetail;
  onReload: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = teachingPlanningAllowsAction(sequence, 'edit');
  const canSubmit = teachingPlanningAllowsAction(sequence, 'submit_for_review');
  const canApprove = teachingPlanningAllowsAction(sequence, 'approve');
  const canReset = teachingPlanningAllowsAction(sequence, 'reset_to_draft');
  const canArchive = teachingPlanningAllowsAction(sequence, 'archive');
  const canDuplicate = teachingPlanningAllowsAction(sequence, 'duplicate_version');
  const canDelete = teachingPlanningAllowsAction(sequence, 'delete');

  async function runSimpleLifecycle(action: 'submit_for_review' | 'approve' | 'duplicate_version') {
    if (saving) return;
    setSaving(true);
    const runners = {
      submit_for_review: () => submitDidacticSequenceForReview(sequence.id),
      approve: () => approveDidacticSequence(sequence.id),
      duplicate_version: () => duplicateDidacticSequenceVersion(sequence.id),
    } as const;
    const res = await runners[action]();
    setSaving(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    const successKey =
      action === 'submit_for_review'
        ? 'admin.teachingPlanning.lifecycle.submitSuccess'
        : action === 'approve'
          ? 'admin.teachingPlanning.lifecycle.approveSuccess'
          : 'admin.teachingPlanning.lifecycle.duplicateVersionSuccess';
    toast.success(t(successKey));
    if (action === 'duplicate_version') {
      router.push(`/admin/teaching-planning/sequences/${res.data.id}`);
      return;
    }
    onReload();
  }

  async function confirmArchiveOrDelete() {
    if (!confirmAction || saving) return;
    setSaving(true);
    const res =
      confirmAction === 'archive'
        ? await archiveDidacticSequence(sequence.id)
        : await deleteDidacticSequence(sequence.id);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(
      t(
        confirmAction === 'archive'
          ? 'admin.teachingPlanning.lifecycle.archiveSuccess'
          : 'admin.teachingPlanning.lifecycle.deleteSuccess',
      ),
    );
    setConfirmAction(null);
    if (confirmAction === 'delete') {
      router.push('/admin/teaching-planning/sequences');
      return;
    }
    onReload();
  }

  const detailRows: Array<{ label: string; value: string | null }> = [
    { label: t('admin.teachingPlanning.sequences.fields.unit'), value: sequence.unit },
    { label: t('admin.teachingPlanning.sequences.fields.lesson'), value: sequence.lesson },
    { label: t('admin.teachingPlanning.sequences.fields.objectives'), value: sequence.objectives },
    {
      label: t('admin.teachingPlanning.sequences.fields.prerequisites'),
      value: sequence.prerequisites,
    },
    {
      label: t('admin.teachingPlanning.sequences.fields.conceptsAndSkills'),
      value: sequence.concepts_and_skills,
    },
    { label: t('admin.teachingPlanning.sequences.fields.pages'), value: sequence.pages },
    {
      label: t('admin.teachingPlanning.sequences.fields.completionCriteria'),
      value: sequence.completion_criteria,
    },
    {
      label: t('admin.teachingPlanning.sequences.fields.supportActivities'),
      value: sequence.support_activities,
    },
  ];

  return (
    <div className="teaching-planning-page">
      <nav
        className="teaching-planning-page__breadcrumb"
        aria-label={t('admin.teachingPlanning.sequences.detailBreadcrumb')}
      >
        <Link href="/admin/teaching-planning/sequences">
          {t('admin.teachingPlanning.sequences.title')}
        </Link>
        <span aria-hidden="true"> / </span>
        <span dir="auto">{sequence.name}</span>
      </nav>

      <Link href="/admin/teaching-planning/sequences" className="back-link">
        ‹ {t('admin.teachingPlanning.sequences.backToList')}
      </Link>

      <PageHeader
        title={sequence.name}
        subtitle={t('admin.teachingPlanning.sequences.detailSubtitle', {
          level: sequence.level.name,
          subject: sequence.subject.name,
        })}
        actions={
          <div className="teaching-planning-page__actions">
            {canEdit ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditOpen(true)}>
                {t('common.edit')}
              </button>
            ) : null}
            {canSubmit ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={saving}
                onClick={() => void runSimpleLifecycle('submit_for_review')}
              >
                {t('admin.teachingPlanning.lifecycle.submitForReview')}
              </button>
            ) : null}
            {canApprove ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={saving}
                onClick={() => void runSimpleLifecycle('approve')}
              >
                {t('admin.teachingPlanning.lifecycle.approve')}
              </button>
            ) : null}
            {canReset ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setResetOpen(true)}>
                {t('admin.teachingPlanning.lifecycle.resetToDraft')}
              </button>
            ) : null}
            {canDuplicate ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={saving}
                onClick={() => void runSimpleLifecycle('duplicate_version')}
              >
                {t('admin.teachingPlanning.lifecycle.duplicateVersion')}
              </button>
            ) : null}
            {canArchive ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmAction('archive')}>
                {t('admin.teachingPlanning.lifecycle.archive')}
              </button>
            ) : null}
            {canDelete ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmAction('delete')}>
                {t('common.delete')}
              </button>
            ) : null}
          </div>
        }
      />

      <div className="teaching-planning-page__actions" style={{ marginBottom: '1rem' }}>
        <WorkflowBadge state={sequence.state} />
        {sequence.version_label ? (
          <Badge tone="slate">
            {t('admin.teachingPlanning.fields.versionLabel')}: <bdi dir="ltr">{sequence.version_label}</bdi>
          </Badge>
        ) : null}
        {!sequence.versioning.is_latest_version ? (
          <Badge tone="amber">{t('admin.teachingPlanning.versions.notLatest')}</Badge>
        ) : null}
        <Badge tone="blue">
          {t('admin.teachingPlanning.sequences.expectedTotalBadge', {
            count: sequence.expected_session_count,
          })}
        </Badge>
      </div>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.sequences.sections.overview')} />
        <dl className="teaching-planning-page__meta-grid">
          <div>
            <dt>{t('admin.teachingPlanning.fields.subject')}</dt>
            <dd dir="auto">{sequence.subject.name}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.fields.level')}</dt>
            <dd dir="auto">{sequence.level.name}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.fields.teachingLanguage')}</dt>
            <dd>
              {sequence.teaching_language
                ? `${sequence.teaching_language.name} (${sequence.teaching_language.code})`
                : t('common.dash')}
            </dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.fields.reference')}</dt>
            <dd dir="auto">
              {sequence.reference ? (
                <Link href={`/admin/teaching-planning/references/${sequence.reference.id}`}>
                  {sequence.reference.name}
                </Link>
              ) : (
                t('common.dash')
              )}
            </dd>
          </div>
        </dl>
        <dl className="teaching-planning-page__meta-grid">
          {detailRows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd dir="auto" style={{ whiteSpace: 'pre-wrap' }}>
                {row.value || t('common.dash')}
              </dd>
            </div>
          ))}
        </dl>
        {sequence.notes ? (
          <p className="muted" dir="auto" style={{ whiteSpace: 'pre-wrap' }}>
            {sequence.notes}
          </p>
        ) : null}
      </Card>

      <Card>
        <SectionHead
          title={t('admin.teachingPlanning.sequences.templates.title')}
          action={
            <span className="muted tiny">
              {t('admin.teachingPlanning.sequences.templates.expectedTotal', {
                count: sequence.expected_session_count,
              })}
            </span>
          }
        />
        <p className="muted tiny">{t('admin.teachingPlanning.sequences.templates.readHint')}</p>
        {sequence.session_templates.length === 0 ? (
          <p className="muted">{t('admin.teachingPlanning.sequences.templates.empty')}</p>
        ) : (
          <ol className="tp-templates__read">
            {sequence.session_templates.map((tpl) => (
              <li key={tpl.id ?? `${tpl.order}-${tpl.name}`} className="tp-templates__read-item">
                <div className="tp-templates__read-head">
                  <span className="tp-templates__order">
                    <bdi dir="ltr">{tpl.order}</bdi>
                  </span>
                  <strong dir="auto">{tpl.name}</strong>
                  <Badge tone="slate">{t(sessionTypeLabelKey(tpl.session_type))}</Badge>
                  <Badge tone="blue">
                    <bdi dir="ltr">{tpl.expected_session_count}</bdi>{' '}
                    {t('admin.teachingPlanning.sequences.templates.sessionsShort')}
                  </Badge>
                  {!tpl.active ? (
                    <Badge tone="amber">
                      {t('admin.teachingPlanning.sequences.templates.inactive')}
                    </Badge>
                  ) : null}
                </div>
                {tpl.objective ? (
                  <p className="muted tiny" dir="auto">
                    {tpl.objective}
                  </p>
                ) : null}
                {tpl.pages ? (
                  <p className="muted tiny">
                    {t('admin.teachingPlanning.sequences.fields.pages')}: <bdi dir="ltr">{tpl.pages}</bdi>
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <DidacticSequenceEditorDialog
        open={editOpen}
        mode="edit"
        initial={sequence}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          toast.success(t('admin.teachingPlanning.sequences.editSuccess'));
          onReload();
        }}
      />

      <TeachingPlanningResetDialog
        open={resetOpen}
        title={t('admin.teachingPlanning.lifecycle.resetToDraft')}
        onClose={() => setResetOpen(false)}
        onConfirm={async (reason) => {
          const res = await resetDidacticSequenceToDraft(sequence.id, {
            reason,
            reset_reason: reason,
          });
          if (!res.success) throw new Error(res.error.message);
          toast.success(t('admin.teachingPlanning.lifecycle.resetToDraftSuccess'));
          onReload();
        }}
      />

      <ConfirmationDialog
        open={confirmAction != null}
        title={
          confirmAction === 'delete'
            ? t('admin.teachingPlanning.lifecycle.delete')
            : t('admin.teachingPlanning.lifecycle.archive')
        }
        body={
          confirmAction === 'delete'
            ? t('admin.teachingPlanning.lifecycle.deleteConfirm', { name: sequence.name })
            : t('admin.teachingPlanning.lifecycle.archiveConfirm', { name: sequence.name })
        }
        variant="danger"
        loading={saving}
        confirmLabel={
          confirmAction === 'delete'
            ? t('common.delete')
            : t('admin.teachingPlanning.lifecycle.archive')
        }
        onConfirm={confirmArchiveOrDelete}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}
