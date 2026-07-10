'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import './parent-profile.css';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { CreateAccountDialog } from '@/features/admin/account/create-account-dialog';
import { Avatar, Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { ParentEditForm } from './parent-edit-form';
import { ParentRelationshipsSection } from './parent-relationships-section';
import { GuardianRestoreDialog } from '@/features/admin/students/components/guardian-restore-dialog';
import { GuardianDeleteDialog } from '@/features/admin/students/components/guardian-delete-dialog';
import { useT } from '@/features/i18n/locale-context';
import { useSession } from '@/features/auth/session-context';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/api/endpoints';
import { hasPermission } from '@/lib/permissions/permissions';
import {
  canUpdateGuardiansLimited,
  canManageGuardianRelationships,
} from '@/lib/permissions/academic-capabilities';
import { statusLabel } from '@/lib/utils/labels';
import { formatMoroccanPhoneDisplay } from '@/features/admin/students/utils/normalize-moroccan-phone';
import { getGuardianEmailPresentation } from '@/features/admin/students/utils/guardian-email-presentation';
import { formatRoleLabels } from '@/features/admin/students/utils/person-role-presentation';
import { formatPersonContactLine } from '@/features/admin/students/components/guardian-relationship-impact-alert';
import { GuardianAccountOnboardingPanel } from '@/features/admin/students/components/guardian-account-onboarding-panel';
import { GuardianPasswordAssignAction } from '@/features/admin/account/guardian-password-assign-action';
import { preferredLanguageLabel } from '../utils/normalize-parent-profile';
import {
  hasIdentityDocument,
  identityDocumentTypeLabelKey,
  resolveFullIdentityDocumentNumber,
} from '../utils/identity-document';
import { isIdentityDocumentType } from '@/types/identity-document';
import { parentAccountPresentationSource } from '../utils/resolve-parent-account-presentation';
import {
  canDeleteGuardianProfile,
  canRestoreGuardianProfile,
  isPersonArchived,
} from '@/features/admin/students/utils/guardian-profile-contract';
import { deleteBlockerMessage } from '@/features/admin/students/utils/guardian-delete-impact';
import type { Parent } from '@/types/parent';

function ParentRecordMenu({
  canArchive,
  canDelete,
  parentId,
  onArchive,
  onDelete,
}: {
  canArchive: boolean;
  canDelete: boolean;
  parentId: number;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (!canArchive && !canDelete) return null;

  return (
    <div className="parent-profile__menu" ref={ref}>
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen((v) => !v)}>
        {t('admin.student360.quickActions.more')}
      </button>
      {open ? (
        <div className="parent-profile__menu-panel">
          {canArchive ? (
            <ConfirmActionButton
              label={t('admin.student360.archiveGuardianProfile')}
              confirmTitle={t('admin.student360.archiveGuardianProfile')}
              confirmMessage={t('admin.student360.archiveGuardianProfileConfirm')}
              path={endpoints.admin.parentArchive(parentId)}
              variant="danger"
              onSuccess={() => {
                setOpen(false);
                onArchive();
                router.push('/admin/parents');
              }}
            />
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="parent-profile__menu-item parent-profile__menu-item--danger"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              {t('admin.guardianProfile.deleteGuardianProfileAction')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ParentProfileView({
  parent,
  editing,
  onEdit,
  onCancelEdit,
  onSaved,
  onReload,
  relationshipsLoading = false,
  relationshipsError = null,
}: {
  parent: Parent;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
  onReload: () => void;
  relationshipsLoading?: boolean;
  relationshipsError?: string | null;
}) {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const archived = isPersonArchived(parent);
  const profileStatus = archived ? 'archived' : parent.status;
  const roleLine = formatRoleLabels(parent.role_labels);
  const emailPresentation = getGuardianEmailPresentation(parent.email);
  const hasAccount =
    parent.account?.has_user_account === true ||
    !!(parent.has_user_account ?? parent.has_account);
  const showCreateAccount =
    !archived &&
    (parent.account?.needs_new_account === true ||
      (parent.needs_new_account === true && !hasAccount));
  const canArchive = !archived && parent.allowed_actions?.archive_guardian_profile === true;
  const canRestore = canRestoreGuardianProfile(parent.allowed_actions);
  const canDelete = canDeleteGuardianProfile(parent.allowed_actions, user);
  const canManageAccount = !!user && hasPermission(user, 'manage_parents');
  const canEditProfile = !!user && canUpdateGuardiansLimited(user);

  const deleteBlockerLines = useMemo(() => {
    const lines: string[] = [];
    if (parent.delete_impact?.blockers?.length) {
      for (const blocker of parent.delete_impact.blockers) {
        lines.push(deleteBlockerMessage(t, blocker));
      }
    } else if (parent.delete_blockers?.length) {
      for (const code of parent.delete_blockers) {
        lines.push(deleteBlockerMessage(t, code));
      }
    } else if (archived && !canDelete && parent.delete_impact?.blocker_message) {
      lines.push(parent.delete_impact.blocker_message);
    }
    return [...new Set(lines)];
  }, [parent.delete_impact, parent.delete_blockers, archived, canDelete, t]);

  const showRecordManagement = archived || canRestore || canArchive || canDelete || deleteBlockerLines.length > 0;

  const contactItems = useMemo(() => {
    const phoneNorm = parent.phone?.trim() ?? '';
    const mobileNorm = parent.mobile?.trim() ?? '';
    const samePhone =
      phoneNorm &&
      mobileNorm &&
      formatMoroccanPhoneDisplay(phoneNorm) === formatMoroccanPhoneDisplay(mobileNorm);
    const unifiedPhone = formatPersonContactLine({
      phone: parent.phone,
      mobile: parent.mobile,
    });

    const items: Array<{ label: string; value: React.ReactNode }> = [];

    if (samePhone && unifiedPhone) {
      items.push({
        label: t('admin.parentProfile.contactNumber'),
        value: (
          <a className="mono parent-profile__contact-link" href={`tel:${phoneNorm}`} dir="ltr">
            {unifiedPhone}
          </a>
        ),
      });
    } else {
      items.push({
        label: t('admin.phone'),
        value: parent.phone ? (
          <a className="mono parent-profile__contact-link" href={`tel:${parent.phone}`} dir="ltr">
            {formatMoroccanPhoneDisplay(parent.phone)}
          </a>
        ) : (
          t('common.dash')
        ),
      });
      items.push({
        label: t('admin.student360.mobile'),
        value: parent.mobile ? (
          <a className="mono parent-profile__contact-link" href={`tel:${parent.mobile}`} dir="ltr">
            {formatMoroccanPhoneDisplay(parent.mobile)}
          </a>
        ) : (
          t('common.dash')
        ),
      });
    }

    items.push({
      label: t('admin.email'),
      value:
        emailPresentation.kind === 'usable' ? (
          <a className="parent-profile__contact-link" href={`mailto:${emailPresentation.email}`} dir="ltr">
            {emailPresentation.email}
          </a>
        ) : (
          t('common.dash')
        ),
    });
    items.push({
      label: t('admin.student360.address'),
      value: parent.street?.trim() || t('common.dash'),
    });
    items.push({
      label: t('admin.student360.city'),
      value: parent.city?.trim() || t('common.dash'),
    });
    items.push({
      label: t('admin.preferredLanguage'),
      value: preferredLanguageLabel(t, parent.preferred_language),
    });
    items.push({
      label: t('admin.notificationOptIn'),
      value: parent.notification_opt_in ? t('common.yes') : t('common.no'),
    });

    return items;
  }, [parent, t, emailPresentation]);

  const identityItems = useMemo(() => {
    if (!hasIdentityDocument(parent)) return [];
    const items: Array<{ label: string; value: React.ReactNode }> = [];
    const type = parent.identity_document_type;
    items.push({
      label: t('admin.identityDocument.type'),
      value: isIdentityDocumentType(type)
        ? t(identityDocumentTypeLabelKey(type))
        : t('common.dash'),
    });
    const fullNumber = resolveFullIdentityDocumentNumber(parent);
    items.push({
      label: t('admin.identityDocument.number'),
      value: fullNumber ? (
        <span className="mono" dir="ltr">
          {fullNumber}
        </span>
      ) : (
        t('common.dash')
      ),
    });
    if (parent.identity_document_country?.trim()) {
      items.push({
        label: t('admin.identityDocument.country'),
        value: (
          <span dir="ltr">{parent.identity_document_country.trim().toUpperCase()}</span>
        ),
      });
    }
    return items;
  }, [parent, t]);

  if (editing) {
    return (
      <ParentEditForm
        parent={parent}
        onSaved={onSaved}
        onCancel={onCancelEdit}
        onRelationshipChanged={onReload}
      />
    );
  }

  return (
    <div className="parent-profile">
      {archived ? (
        <div className="parent-profile__archived-banner" role="status">
          <strong>{t('admin.guardianProfile.archivedProfileBanner')}</strong>
          <p className="tiny">{t('admin.guardianProfile.archivedCannotLinkHint')}</p>
        </div>
      ) : null}

      <Card className="parent-profile__hero">
        <div className="parent-profile__hero-main">
          <Avatar name={parent.display_name ?? parent.name} />
          <div className="parent-profile__hero-text">
            <h2 className="parent-profile__name" dir="auto">
              {parent.display_name ?? parent.name}
            </h2>
            <div className="parent-profile__hero-meta">
              <Badge tone={archived ? 'slate' : profileStatus === 'active' ? 'green' : 'slate'}>
                {archived ? t('admin.guardianProfile.archivedBadge') : statusLabel(t, profileStatus)}
              </Badge>
              {parent.needs_review ? (
                <Badge tone="amber">{t('admin.student360.recordNeedsReview')}</Badge>
              ) : null}
              {roleLine ? (
                <span className="parent-profile__roles-line">{roleLine}</span>
              ) : null}
              {hasAccount ? (
                <Badge tone="green">{t('admin.parentProfile.existingLoginAccount')}</Badge>
              ) : (
                <Badge tone="slate">{t('admin.student360.noLoginAccount')}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="parent-profile__hero-actions">
          {!archived && canEditProfile ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={onEdit}>
              {t('common.edit')}
            </button>
          ) : null}
          {canRestore ? (
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setRestoreOpen(true)}>
              {t('admin.guardianProfile.restoreAction')}
            </button>
          ) : null}
          <ParentRecordMenu
            canArchive={canArchive}
            canDelete={canDelete}
            parentId={parent.id}
            onArchive={onReload}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>
      </Card>

      {showRecordManagement ? (
        <Card className="parent-profile__record-management">
          <SectionHead title={t('admin.guardianProfile.recordManagement')} />
          <div className="parent-profile__record-actions">
            {canRestore ? (
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setRestoreOpen(true)}>
                {t('admin.guardianProfile.restoreAction')}
              </button>
            ) : null}
            {canArchive ? (
              <ConfirmActionButton
                label={t('admin.student360.archiveGuardianProfile')}
                confirmTitle={t('admin.student360.archiveGuardianProfile')}
                confirmMessage={t('admin.student360.archiveGuardianProfileConfirm')}
                path={endpoints.admin.parentArchive(parent.id)}
                variant="danger"
                onSuccess={onReload}
              />
            ) : null}
            {canDelete ? (
              <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleteOpen(true)}>
                {t('admin.guardianProfile.deleteGuardianProfileAction')}
              </button>
            ) : null}
          </div>
          {deleteBlockerLines.length ? (
            <ul className="parent-profile__blockers">
              {deleteBlockerLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <div className="parent-profile__layout">
        <Card>
          <SectionHead title={t('admin.contact')} />
          <DefinitionList items={contactItems} />
        </Card>

        {identityItems.length > 0 ? (
          <Card>
            <SectionHead title={t('admin.identityDocument.sectionTitle')} />
            <DefinitionList items={identityItems} />
          </Card>
        ) : null}

        <Card className="parent-profile__account-card">
          <SectionHead title={t('admin.parentProfile.accountAndRoles')} />
          <div className="parent-profile__account-body">
            <GuardianAccountOnboardingPanel source={parentAccountPresentationSource(parent)} />
            <DefinitionList
              items={[
                {
                  label: t('admin.parentProfile.currentRoles'),
                  value: roleLine || t('common.dash'),
                },
              ]}
            />
            {hasAccount && roleLine ? (
              <p className="tiny muted">{t('admin.student360.singleLoginForRoles')}</p>
            ) : null}
            {hasAccount && canManageAccount && !archived ? (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setAccountDialogOpen(true)}
              >
                {t('admin.parentProfile.manageLoginAccount')}
              </button>
            ) : null}
            {!archived && canManageAccount ? (
              <GuardianPasswordAssignAction
                guardianId={parent.id}
                guardianName={parent.display_name ?? parent.name}
                account={parent.account}
                onAccountUpdated={() => onReload()}
              />
            ) : null}
            {!hasAccount && showCreateAccount && canManageAccount ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setAccountDialogOpen(true)}
              >
                {t('admin.account.createAccount')}
              </button>
            ) : null}
            {!hasAccount && !showCreateAccount ? (
              <p className="muted">{t('admin.student360.noLoginAccount')}</p>
            ) : null}
          </div>
        </Card>

        <Card className="parent-profile__relationships-card">
          <ParentRelationshipsSection
            parent={parent}
            onRelationshipChanged={onReload}
            loading={relationshipsLoading}
            error={relationshipsError}
            onRetry={onReload}
          />
        </Card>
      </div>

      <CreateAccountDialog
        open={accountDialogOpen}
        title={t('admin.account.activateAccountTitle', { name: parent.name })}
        endpoint={endpoints.admin.parentAccount(parent.id)}
        defaultEmail={emailPresentation.kind === 'usable' ? emailPresentation.email : ''}
        onClose={() => setAccountDialogOpen(false)}
        onSuccess={() => {
          setAccountDialogOpen(false);
          onReload();
        }}
      />

      <GuardianRestoreDialog
        open={restoreOpen}
        target={parent}
        onClose={() => setRestoreOpen(false)}
        onRestored={onReload}
      />

      <GuardianDeleteDialog
        open={deleteOpen}
        parentId={parent.id}
        parentName={parent.display_name ?? parent.name}
        allowedActions={parent.allowed_actions}
        initialImpact={parent.delete_impact ?? null}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          setDeleteOpen(false);
          router.push('/admin/parents');
        }}
      />
    </div>
  );
}
