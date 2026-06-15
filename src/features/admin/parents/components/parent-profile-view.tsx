'use client';

import { useMemo, useRef, useState } from 'react';
import './parent-profile.css';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { CreateAccountDialog } from '@/features/admin/account/create-account-dialog';
import { Avatar, Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { ParentEditForm } from './parent-edit-form';
import { ParentRelationshipsSection } from './parent-relationships-section';
import { useT } from '@/features/i18n/locale-context';
import { useSession } from '@/features/auth/session-context';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/api/endpoints';
import { hasPermission } from '@/lib/permissions/permissions';
import { statusLabel } from '@/lib/utils/labels';
import { formatMoroccanPhoneDisplay } from '@/features/admin/students/utils/normalize-moroccan-phone';
import { getGuardianEmailPresentation } from '@/features/admin/students/utils/guardian-email-presentation';
import { formatRoleLabels } from '@/features/admin/students/utils/person-role-presentation';
import { formatPersonContactLine } from '@/features/admin/students/components/guardian-relationship-impact-alert';
import { normalizeAccountInfo, resolveAccountStatus } from '@/lib/account/account-utils';
import { preferredLanguageLabel, parentAccountEntityFields } from '../utils/normalize-parent-profile';
import type { Parent } from '@/types/parent';

function ParentHeaderMenu({
  canArchive,
  parentId,
  onArchived,
}: {
  canArchive: boolean;
  parentId: number;
  onArchived: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!canArchive) return null;

  return (
    <div className="parent-profile__menu" ref={ref}>
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen((v) => !v)}>
        {t('admin.student360.quickActions.more')}
      </button>
      {open ? (
        <div className="parent-profile__menu-panel">
          <ConfirmActionButton
            label={t('admin.student360.archiveGuardianProfile')}
            confirmTitle={t('admin.student360.archiveGuardianProfile')}
            confirmMessage={t('admin.student360.archiveGuardianProfileConfirm')}
            path={endpoints.admin.parentArchive(parentId)}
            variant="danger"
            onSuccess={() => {
              setOpen(false);
              onArchived();
              router.push('/admin/parents');
            }}
          />
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
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  const roleLine = formatRoleLabels(parent.role_labels);
  const emailPresentation = getGuardianEmailPresentation(parent.email);
  const hasAccount =
    parent.account?.has_user_account === true ||
    !!(parent.has_user_account ?? parent.has_account);
  const showCreateAccount =
    parent.account?.needs_new_account === true ||
    (parent.needs_new_account === true && !hasAccount);
  const canArchive = parent.allowed_actions?.archive_guardian_profile === true;
  const canManageAccount = !!user && hasPermission(user, 'manage_parents');
  const accountEntity = parentAccountEntityFields(parent);
  const accountStatus = resolveAccountStatus(accountEntity);
  const account = normalizeAccountInfo(accountEntity);
  const login =
    account?.login ??
    parent.login ??
    (emailPresentation.kind === 'usable' ? emailPresentation.email : null);

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
      <Card className="parent-profile__hero">
        <div className="parent-profile__hero-main">
          <Avatar name={parent.display_name ?? parent.name} />
          <div className="parent-profile__hero-text">
            <h2 className="parent-profile__name" dir="auto">
              {parent.display_name ?? parent.name}
            </h2>
            <div className="parent-profile__hero-meta">
              <Badge tone={parent.status === 'active' ? 'green' : 'slate'}>
                {statusLabel(t, parent.status)}
              </Badge>
              {parent.needs_review ? (
                <Badge tone="amber">{t('admin.student360.recordNeedsReview')}</Badge>
              ) : null}
              {roleLine ? (
                <span className="parent-profile__roles-line">{roleLine}</span>
              ) : null}
              {hasAccount ? (
                <Badge tone="green">{t('admin.parentProfile.existingLoginAccount')}</Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="parent-profile__hero-actions">
          {parent.status !== 'archived' ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={onEdit}>
              {t('common.edit')}
            </button>
          ) : null}
          <ParentHeaderMenu canArchive={canArchive} parentId={parent.id} onArchived={onReload} />
        </div>
      </Card>

      <div className="parent-profile__layout">
        <Card>
          <SectionHead title={t('admin.contact')} />
          <DefinitionList items={contactItems} />
        </Card>

        <Card className="parent-profile__account-card">
          <SectionHead title={t('admin.parentProfile.accountAndRoles')} />
          <div className="parent-profile__account-body">
            <DefinitionList
              items={[
                {
                  label: t('admin.parentProfile.loginAccountLabel'),
                  value:
                    accountStatus === 'active'
                      ? t('admin.account.accountActive')
                      : accountStatus === 'not_created'
                        ? t('admin.account.noAccount')
                        : t('admin.account.accountInactive'),
                },
                {
                  label: t('admin.account.loginName'),
                  value: login ? <span dir="ltr">{login}</span> : t('common.dash'),
                },
                {
                  label: t('admin.parentProfile.currentRoles'),
                  value: roleLine || t('common.dash'),
                },
              ]}
            />
            {hasAccount && roleLine ? (
              <p className="tiny muted">{t('admin.student360.singleLoginForRoles')}</p>
            ) : null}
            {hasAccount && canManageAccount ? (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setAccountDialogOpen(true)}
              >
                {t('admin.parentProfile.manageLoginAccount')}
              </button>
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
    </div>
  );
}
