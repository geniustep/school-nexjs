'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { EmptyState } from '@/components/states/states';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Badge, Card, InfoBanner, PageHeader, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { updateTeachingAssignment } from '@/features/admin/academic-setup/hooks/use-teaching-assignments';
import {
  activateTeachingOffering,
  approveTeachingOffering,
  archiveTeachingOffering,
  deleteTeachingOffering,
  duplicateTeachingOffering,
  resetTeachingOfferingToDraft,
  submitTeachingOfferingForReview,
} from '@/features/admin/teaching-planning/api/teaching-offerings-api';
import { AnnualDistributionEditorDialog } from '@/features/admin/teaching-planning/components/annual-distribution-dialogs';
import { TeachingOfferingEditorDialog } from '@/features/admin/teaching-planning/components/teaching-offering-dialogs';
import { TeachingPlanningResetDialog } from '@/features/admin/teaching-planning/components/teaching-reference-dialogs';
import { teachingPlanningAllowsAction } from '@/features/admin/teaching-planning/utils/normalize-teaching-planning';
import {
  filterAssignmentCandidatesForOffering,
  offeringShowsAnnualDistributionRequired,
  teachingOfferingReadinessTone,
  teachingPlanningBlockerLabelKey,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useSession } from '@/features/auth/session-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { canManageAnnualDistributions } from '@/lib/permissions/teaching-planning';
import type { TeachingAssignment } from '@/types/academic-setup';
import type { TeachingOfferingDetail } from '@/types/teaching-planning';
import '@/features/admin/teaching-planning/teaching-planning.css';

type DetailSection = 'overview' | 'reference' | 'assignments';

function blockerLabel(t: (key: string) => string, code: string): string {
  const key = teachingPlanningBlockerLabelKey(code);
  const translated = t(key);
  return translated === key ? code : translated;
}

export function TeachingOfferingDetailView({
  offering,
  onReload,
}: {
  offering: TeachingOfferingDetail;
  onReload: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const user = useSession();
  const { formatDate, formatDateTime } = useFormat();
  const canManageDistributions = canManageAnnualDistributions(user);

  const [section, setSection] = useState<DetailSection>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [createDistributionOpen, setCreateDistributionOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | 'activate' | null>(
    null,
  );
  const [lifecycleSaving, setLifecycleSaving] = useState(false);
  const [linkSavingId, setLinkSavingId] = useState<number | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<number | null>(null);

  const assignmentsState = useAdminResource<TeachingAssignment[]>(
    linkOpen ? endpoints.admin.teachingAssignments : null,
    { page_size: 200 },
  );

  const canEdit = teachingPlanningAllowsAction(offering, 'edit');
  const canSubmit = teachingPlanningAllowsAction(offering, 'submit_for_review');
  const canApprove = teachingPlanningAllowsAction(offering, 'approve');
  const canReset = teachingPlanningAllowsAction(offering, 'reset_to_draft');
  const canArchive = teachingPlanningAllowsAction(offering, 'archive');
  const canDuplicate = teachingPlanningAllowsAction(offering, 'duplicate');
  const canDelete = teachingPlanningAllowsAction(offering, 'delete');
  const canLinkAssignments = teachingPlanningAllowsAction(offering, 'link_assignments');
  const canActivate = teachingPlanningAllowsAction(offering, 'activate');

  const needsDistribution = offeringShowsAnnualDistributionRequired(offering);
  const isActive = offering.state === 'active';

  const candidateAssignments = useMemo(() => {
    const rows = Array.isArray(assignmentsState.data) ? assignmentsState.data : [];
    return filterAssignmentCandidatesForOffering(rows, offering);
  }, [assignmentsState.data, offering]);

  async function runSimpleLifecycle(
    action: 'submit_for_review' | 'approve' | 'duplicate',
  ) {
    if (lifecycleSaving) return;
    setLifecycleSaving(true);
    const runners = {
      submit_for_review: () => submitTeachingOfferingForReview(offering.id),
      approve: () => approveTeachingOffering(offering.id),
      duplicate: () => duplicateTeachingOffering(offering.id),
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
          : 'admin.teachingPlanning.lifecycle.duplicateSuccess';
    toast.success(t(successKey));
    if (action === 'duplicate') {
      router.push(`/admin/teaching-planning/offerings/${res.data.id}`);
      return;
    }
    onReload();
  }

  async function confirmArchiveOrDelete() {
    if (!confirmAction || lifecycleSaving) return;
    setLifecycleSaving(true);
    const res =
      confirmAction === 'archive'
        ? await archiveTeachingOffering(offering.id)
        : confirmAction === 'activate'
          ? await activateTeachingOffering(offering.id)
          : await deleteTeachingOffering(offering.id);
    setLifecycleSaving(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(
      t(
        confirmAction === 'archive'
          ? 'admin.teachingPlanning.lifecycle.archiveSuccess'
          : confirmAction === 'activate'
            ? 'admin.teachingPlanning.offerings.activateSuccess'
            : 'admin.teachingPlanning.lifecycle.deleteSuccess',
      ),
    );
    const wasDelete = confirmAction === 'delete';
    setConfirmAction(null);
    if (wasDelete) {
      router.push('/admin/teaching-planning/offerings');
      return;
    }
    onReload();
  }

  async function linkAssignment(assignmentId: number) {
    if (linkSavingId != null) return;
    setLinkSavingId(assignmentId);
    const res = await updateTeachingAssignment(assignmentId, {
      teaching_offering_id: offering.id,
    });
    setLinkSavingId(null);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(t('admin.teachingPlanning.assignments.linkSuccess'));
    setLinkOpen(false);
    onReload();
  }

  async function unlinkAssignment() {
    if (unlinkTarget == null || linkSavingId != null) return;
    setLinkSavingId(unlinkTarget);
    const res = await updateTeachingAssignment(unlinkTarget, {
      teaching_offering_id: null,
    });
    setLinkSavingId(null);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(t('admin.teachingPlanning.assignments.unlinkSuccess'));
    setUnlinkTarget(null);
    onReload();
  }

  const readinessItems = [
    {
      key: 'identity_ready',
      ready: offering.readiness.identity_ready,
      label: t('admin.teachingPlanning.readiness.identityReady'),
    },
    {
      key: 'reference_ready',
      ready: offering.readiness.reference_ready,
      label: t('admin.teachingPlanning.readiness.referenceReady'),
    },
    {
      key: 'assignments_ready',
      ready: offering.readiness.assignments_ready,
      label: t('admin.teachingPlanning.readiness.assignmentsReady'),
    },
    {
      key: 'distribution_ready',
      ready: offering.readiness.distribution_ready,
      label: t('admin.teachingPlanning.readiness.distributionReady'),
    },
    {
      key: 'ready_for_approval',
      ready: offering.readiness.ready_for_approval,
      label: t('admin.teachingPlanning.readiness.readyForApproval'),
    },
    {
      key: 'ready_for_activation',
      ready: offering.readiness.ready_for_activation,
      label: t('admin.teachingPlanning.readiness.readyForActivation'),
    },
  ] as const;

  return (
    <div className="teaching-planning-page">
      <nav
        className="teaching-planning-page__breadcrumb"
        aria-label={t('admin.teachingPlanning.offerings.detailBreadcrumb')}
      >
        <Link href="/admin/teaching-planning/offerings">
          {t('admin.teachingPlanning.offerings.title')}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{offering.display_name}</span>
      </nav>

      <Link href="/admin/teaching-planning/offerings" className="back-link">
        ‹ {t('admin.teachingPlanning.offerings.backToList')}
      </Link>

      <PageHeader
        title={offering.display_name}
        subtitle={t('admin.teachingPlanning.offerings.detailSubtitle', {
          year: offering.academic_year.name,
          level: offering.level.name,
          subject: offering.subject.name,
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
            {canActivate ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={lifecycleSaving}
                onClick={() => setConfirmAction('activate')}
              >
                {t('admin.teachingPlanning.offerings.activate')}
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
                onClick={() => void runSimpleLifecycle('duplicate')}
              >
                {t('admin.teachingPlanning.lifecycle.duplicate')}
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
        <WorkflowBadge state={offering.state} />
        {isActive ? (
          <Badge tone="green">{t('admin.teachingPlanning.offerings.activeBadge')}</Badge>
        ) : null}
      </div>

      {needsDistribution ? (
        <InfoBanner
          tone="amber"
          icon="⚠"
          title={t('admin.teachingPlanning.offerings.distributionRequiredTitle')}
          description={t('admin.teachingPlanning.offerings.distributionRequiredDesc')}
        />
      ) : null}

      <div className="teaching-planning-page__actions" style={{ marginBlock: '1rem' }}>
        {(
          [
            ['overview', 'admin.teachingPlanning.offerings.sections.overview'],
            ['reference', 'admin.teachingPlanning.offerings.sections.reference'],
            ['assignments', 'admin.teachingPlanning.offerings.sections.assignments'],
          ] as const
        ).map(([key, labelKey]) => (
          <button
            key={key}
            type="button"
            className={`btn btn--sm ${section === key ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setSection(key)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {section === 'overview' ? (
        <>
          <Card>
            <SectionHead title={t('admin.teachingPlanning.offerings.sections.overview')} />
            <dl className="teaching-planning-page__meta-grid">
              <div>
                <dt>{t('admin.teachingPlanning.fields.school')}</dt>
                <dd dir="auto">{offering.school.name}</dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.fields.academicYear')}</dt>
                <dd dir="auto">{offering.academic_year.name}</dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.fields.level')}</dt>
                <dd dir="auto">{offering.level.name}</dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.fields.subject')}</dt>
                <dd dir="auto">{offering.subject.name}</dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.fields.teachingLanguage')}</dt>
                <dd>
                  {offering.teaching_language
                    ? `${offering.teaching_language.name} (${offering.teaching_language.code})`
                    : t('common.dash')}
                </dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.fields.effectiveFrom')}</dt>
                <dd>
                  {offering.effective_from
                    ? formatDate(offering.effective_from)
                    : t('common.dash')}
                </dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.fields.effectiveTo')}</dt>
                <dd>
                  {offering.effective_to
                    ? formatDate(offering.effective_to)
                    : t('common.dash')}
                </dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.fields.approvedAt')}</dt>
                <dd>
                  {offering.approved_at
                    ? formatDateTime(offering.approved_at)
                    : t('common.dash')}
                </dd>
              </div>
            </dl>
            {offering.notes ? (
              <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
                {offering.notes}
              </p>
            ) : null}
          </Card>

          <Card>
            <SectionHead title={t('admin.teachingPlanning.readiness.title')} />
            <div className="teaching-planning-page__checklist">
              {readinessItems.map((item) => (
                <div key={item.key} className="teaching-planning-page__checklist-item">
                  <Badge tone={teachingOfferingReadinessTone(item.ready)}>{item.label}</Badge>
                  <span className="muted tiny">
                    {item.ready
                      ? t('admin.teachingPlanning.readiness.readyYes')
                      : t('admin.teachingPlanning.readiness.readyNo')}
                  </span>
                </div>
              ))}
            </div>
            {(offering.readiness.blockers.length > 0 ||
              offering.activation_blockers.length > 0) && (
              <div className="teaching-planning-page__actions">
                {Array.from(
                  new Set([...offering.readiness.blockers, ...offering.activation_blockers]),
                ).map((code) => (
                  <Badge key={code} tone="amber">
                    {blockerLabel(t, code)}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionHead
              title={t('admin.teachingPlanning.offerings.distributionSectionTitle')}
              action={
                <Link
                  href="/admin/teaching-planning/distributions"
                  className="btn btn--ghost btn--sm"
                >
                  {t('admin.teachingPlanning.offerings.openDistributions')}
                </Link>
              }
            />
            <dl className="teaching-planning-page__meta-grid">
              <div>
                <dt>{t('admin.teachingPlanning.offerings.activeDistribution')}</dt>
                <dd dir="auto">
                  {offering.active_distribution ? (
                    <Link
                      href={`/admin/teaching-planning/distributions/${offering.active_distribution.id}`}
                    >
                      {offering.active_distribution.name}
                    </Link>
                  ) : (
                    t('admin.teachingPlanning.offerings.noActiveDistribution')
                  )}
                </dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.offerings.distributionCount')}</dt>
                <dd>
                  <bdi dir="ltr">{offering.distribution_count ?? 0}</bdi>
                </dd>
              </div>
            </dl>
            <p className="muted tiny">
              {t('admin.teachingPlanning.offerings.distributionSectionHint')}
            </p>
            {canManageDistributions ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setCreateDistributionOpen(true)}
              >
                {t('admin.teachingPlanning.distributions.create.open')}
              </button>
            ) : null}
          </Card>
        </>
      ) : null}

      {section === 'reference' ? (
        <Card>
          <SectionHead title={t('admin.teachingPlanning.offerings.sections.reference')} />
          {offering.reference ? (
            <div>
              <p>
                <Link href={`/admin/teaching-planning/references/${offering.reference.id}`}>
                  {offering.reference.name}
                </Link>
              </p>
              <WorkflowBadge state={offering.reference.state} />
            </div>
          ) : (
            <EmptyState
              compact
              icon="📚"
              title={t('admin.teachingPlanning.offerings.noReferenceTitle')}
              description={t('admin.teachingPlanning.offerings.noReferenceDesc')}
            />
          )}
        </Card>
      ) : null}

      {section === 'assignments' ? (
        <Card>
          <SectionHead
            title={t('admin.teachingPlanning.offerings.sections.assignments')}
            action={
              <div className="teaching-planning-page__actions">
                <Link
                  href="/admin/settings/academic-setup/assignments"
                  className="btn btn--ghost btn--sm"
                >
                  {t('admin.teachingPlanning.assignments.openAcademicSetup')}
                </Link>
                {canLinkAssignments ? (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => setLinkOpen(true)}
                  >
                    {t('admin.teachingPlanning.assignments.linkOpen')}
                  </button>
                ) : null}
              </div>
            }
          />
          {offering.assignments.length === 0 ? (
            <EmptyState
              compact
              icon="👥"
              title={t('admin.teachingPlanning.assignments.emptyTitle')}
              description={t('admin.teachingPlanning.assignments.emptyDesc')}
            />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {offering.assignments.map((assignment) => (
                <li
                  key={assignment.id}
                  className="between"
                  style={{ padding: '0.65rem 0', gap: '0.75rem' }}
                >
                  <div>
                    <strong dir="auto">
                      {assignment.class?.name || t('common.dash')}
                      {' · '}
                      {assignment.teacher?.name || t('common.dash')}
                    </strong>
                    <div className="muted tiny">
                      {assignment.subject?.name || t('common.dash')}
                      {assignment.role ? ` · ${assignment.role}` : ''}
                    </div>
                  </div>
                  {canLinkAssignments ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setUnlinkTarget(assignment.id)}
                    >
                      {t('admin.teachingPlanning.assignments.unlink')}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      <TeachingOfferingEditorDialog
        open={editOpen}
        mode="edit"
        initial={offering}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          toast.success(t('admin.teachingPlanning.offerings.editSuccess'));
          onReload();
        }}
      />

      <TeachingPlanningResetDialog
        open={resetOpen}
        title={t('admin.teachingPlanning.lifecycle.resetToDraft')}
        onClose={() => setResetOpen(false)}
        onConfirm={async (reason) => {
          const res = await resetTeachingOfferingToDraft(offering.id, {
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
            : confirmAction === 'activate'
              ? t('admin.teachingPlanning.offerings.activate')
              : t('admin.teachingPlanning.lifecycle.archive')
        }
        body={
          confirmAction === 'delete'
            ? t('admin.teachingPlanning.lifecycle.deleteConfirm', {
                name: offering.display_name,
              })
            : confirmAction === 'activate'
              ? t('admin.teachingPlanning.offerings.activateConfirm', {
                  name: offering.display_name,
                })
              : t('admin.teachingPlanning.lifecycle.archiveConfirm', {
                  name: offering.display_name,
                })
        }
        variant={confirmAction === 'activate' ? 'primary' : 'danger'}
        loading={lifecycleSaving}
        confirmLabel={
          confirmAction === 'delete'
            ? t('common.delete')
            : confirmAction === 'activate'
              ? t('admin.teachingPlanning.offerings.activate')
              : t('admin.teachingPlanning.lifecycle.archive')
        }
        onConfirm={confirmArchiveOrDelete}
        onClose={() => setConfirmAction(null)}
      />

      <AnnualDistributionEditorDialog
        open={createDistributionOpen}
        mode="create"
        lockedOffering={offering}
        onClose={() => setCreateDistributionOpen(false)}
        onSaved={(item) => {
          setCreateDistributionOpen(false);
          router.push(`/admin/teaching-planning/distributions/${item.id}`);
        }}
      />

      <ConfirmationDialog
        open={unlinkTarget != null}
        title={t('admin.teachingPlanning.assignments.unlinkTitle')}
        body={t('admin.teachingPlanning.assignments.unlinkConfirm')}
        variant="danger"
        loading={linkSavingId != null}
        confirmLabel={t('admin.teachingPlanning.assignments.unlink')}
        onConfirm={unlinkAssignment}
        onClose={() => setUnlinkTarget(null)}
      />

      <ConfirmationDialog
        open={linkOpen}
        size="form"
        title={t('admin.teachingPlanning.assignments.linkTitle')}
        confirmLabel={t('common.close')}
        onConfirm={() => setLinkOpen(false)}
        onClose={() => setLinkOpen(false)}
        body={
          <div className="teaching-planning-dialog">
            <p className="muted">{t('admin.teachingPlanning.assignments.linkHint')}</p>
            {assignmentsState.loading ? (
              <p className="muted">{t('common.loading')}</p>
            ) : candidateAssignments.length === 0 ? (
              <EmptyState
                compact
                icon="🔍"
                title={t('admin.teachingPlanning.assignments.noCandidatesTitle')}
                description={t('admin.teachingPlanning.assignments.noCandidatesDesc')}
              />
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {candidateAssignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="between"
                    style={{ padding: '0.5rem 0', gap: '0.75rem' }}
                  >
                    <div>
                      <strong dir="auto">
                        {assignment.class?.name || t('common.dash')}
                        {' · '}
                        {assignment.teacher?.name || t('common.dash')}
                      </strong>
                      <div className="muted tiny">
                        {assignment.subject?.name || t('common.dash')}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={linkSavingId != null}
                      onClick={() => void linkAssignment(assignment.id)}
                    >
                      {linkSavingId === assignment.id
                        ? t('common.submitting')
                        : t('admin.teachingPlanning.assignments.link')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        }
      />
    </div>
  );
}
