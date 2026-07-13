'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Card, InfoBanner, PageHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import {
  TeachingPlanningResetDialog,
  TeachingReferenceEditorDialog,
} from '@/features/admin/teaching-planning/components/teaching-reference-dialogs';
import {
  approveTeachingReference,
  archiveTeachingReference,
  deleteTeachingReference,
  duplicateTeachingReferenceVersion,
  resetTeachingReferenceToDraft,
  submitTeachingReferenceForReview,
} from '@/features/admin/teaching-planning/api/teaching-references-api';
import { teachingPlanningAllowsAction } from '@/features/admin/teaching-planning/utils/normalize-teaching-planning';
import type { TeachingReferenceDetail } from '@/types/teaching-planning';
import '@/features/admin/teaching-planning/teaching-planning.css';

export function TeachingReferenceDetailView({
  reference,
  onReload,
}: {
  reference: TeachingReferenceDetail;
  onReload: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { formatDateTime } = useFormat();

  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null);
  const [lifecycleSaving, setLifecycleSaving] = useState(false);

  const canEdit = teachingPlanningAllowsAction(reference, 'edit');
  const canSubmit = teachingPlanningAllowsAction(reference, 'submit_for_review');
  const canApprove = teachingPlanningAllowsAction(reference, 'approve');
  const canReset = teachingPlanningAllowsAction(reference, 'reset_to_draft');
  const canArchive = teachingPlanningAllowsAction(reference, 'archive');
  const canDuplicate = teachingPlanningAllowsAction(reference, 'duplicate_version');
  const canDelete = teachingPlanningAllowsAction(reference, 'delete');

  async function runSimpleLifecycle(
    action: 'submit_for_review' | 'approve' | 'duplicate_version',
  ) {
    if (lifecycleSaving) return;
    setLifecycleSaving(true);
    const runners = {
      submit_for_review: () => submitTeachingReferenceForReview(reference.id),
      approve: () => approveTeachingReference(reference.id),
      duplicate_version: () => duplicateTeachingReferenceVersion(reference.id),
    } as const;
    const res = await runners[action]();
    setLifecycleSaving(false);
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
      router.push(`/admin/teaching-planning/references/${res.data.id}`);
      return;
    }
    onReload();
  }

  async function confirmArchiveOrDelete() {
    if (!confirmAction || lifecycleSaving) return;
    setLifecycleSaving(true);
    const res =
      confirmAction === 'archive'
        ? await archiveTeachingReference(reference.id)
        : await deleteTeachingReference(reference.id);
    setLifecycleSaving(false);
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
      router.push('/admin/teaching-planning/references');
      return;
    }
    onReload();
  }

  return (
    <div className="teaching-planning-page">
      <nav
        className="teaching-planning-page__breadcrumb"
        aria-label={t('admin.teachingPlanning.references.detailBreadcrumb')}
      >
        <Link href="/admin/teaching-planning/references">
          {t('admin.teachingPlanning.references.title')}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{reference.name}</span>
      </nav>

      <Link href="/admin/teaching-planning/references" className="back-link">
        ‹ {t('admin.teachingPlanning.references.backToList')}
      </Link>

      <PageHeader
        title={reference.name}
        subtitle={t('admin.teachingPlanning.references.detailSubtitle', {
          level: reference.level.name,
          subject: reference.subject.name,
        })}
        actions={
          <div className="teaching-planning-page__actions">
            {canEdit ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setEditOpen(true)}
              >
                {t('common.edit')}
              </button>
            ) : null}
            {canSubmit ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={lifecycleSaving}
                onClick={() => void runSimpleLifecycle('submit_for_review')}
              >
                {t('admin.teachingPlanning.lifecycle.submitForReview')}
              </button>
            ) : null}
            {canApprove ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={lifecycleSaving}
                onClick={() => void runSimpleLifecycle('approve')}
              >
                {t('admin.teachingPlanning.lifecycle.approve')}
              </button>
            ) : null}
            {canReset ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setResetOpen(true)}
              >
                {t('admin.teachingPlanning.lifecycle.resetToDraft')}
              </button>
            ) : null}
            {canDuplicate ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={lifecycleSaving}
                onClick={() => void runSimpleLifecycle('duplicate_version')}
              >
                {t('admin.teachingPlanning.lifecycle.duplicateVersion')}
              </button>
            ) : null}
            {canArchive ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmAction('archive')}
              >
                {t('admin.teachingPlanning.lifecycle.archive')}
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmAction('delete')}
              >
                {t('common.delete')}
              </button>
            ) : null}
          </div>
        }
      />

      <div className="teaching-planning-page__actions" style={{ marginBottom: '1rem' }}>
        <WorkflowBadge state={reference.state} />
      </div>

      {reference.reset_reason ? (
        <InfoBanner
          tone="amber"
          icon="⚠"
          title={t('admin.teachingPlanning.fields.resetReason')}
          description={reference.reset_reason}
        />
      ) : null}

      <Card>
        <dl className="teaching-planning-page__meta-grid">
          <div>
            <dt>{t('admin.teachingPlanning.fields.school')}</dt>
            <dd dir="auto">{reference.school.name}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.fields.level')}</dt>
            <dd dir="auto">{reference.level.name}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.fields.subject')}</dt>
            <dd dir="auto">{reference.subject.name}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.fields.teachingLanguage')}</dt>
            <dd>
              {reference.teaching_language
                ? `${reference.teaching_language.name} (${reference.teaching_language.code})`
                : t('common.dash')}
            </dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.fields.publisher')}</dt>
            <dd dir="auto">{reference.publisher || t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.fields.edition')}</dt>
            <dd dir="auto">{reference.edition || t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.fields.versionLabel')}</dt>
            <dd dir="auto">{reference.version_label || t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.fields.referenceCode')}</dt>
            <dd dir="ltr">{reference.reference_code || t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.fields.isbn')}</dt>
            <dd dir="ltr">{reference.isbn || t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.columns.offeringCount')}</dt>
            <dd>{reference.offering_count}</dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.fields.approvedAt')}</dt>
            <dd>
              {reference.approved_at
                ? formatDateTime(reference.approved_at)
                : t('common.dash')}
            </dd>
          </div>
          <div>
            <dt>{t('admin.teachingPlanning.fields.archivedAt')}</dt>
            <dd>
              {reference.archived_at
                ? formatDateTime(reference.archived_at)
                : t('common.dash')}
            </dd>
          </div>
        </dl>
        {reference.notes ? (
          <p className="muted" style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
            {reference.notes}
          </p>
        ) : null}
      </Card>

      <TeachingReferenceEditorDialog
        open={editOpen}
        mode="edit"
        initial={reference}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          toast.success(t('admin.teachingPlanning.references.editSuccess'));
          onReload();
        }}
      />

      <TeachingPlanningResetDialog
        open={resetOpen}
        title={t('admin.teachingPlanning.lifecycle.resetToDraft')}
        onClose={() => setResetOpen(false)}
        onConfirm={async (reason) => {
          const res = await resetTeachingReferenceToDraft(reference.id, {
            reason,
            reset_reason: reason,
          });
          if (!res.success) {
            throw new Error(res.error.message);
          }
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
            ? t('admin.teachingPlanning.lifecycle.deleteConfirm', { name: reference.name })
            : t('admin.teachingPlanning.lifecycle.archiveConfirm', { name: reference.name })
        }
        variant="danger"
        loading={lifecycleSaving}
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
