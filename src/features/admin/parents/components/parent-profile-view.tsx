'use client';

import './parent-profile.css';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { EntityAccountPanel } from '@/features/admin/account/entity-account-panel';
import { ParentEditForm } from './parent-edit-form';
import { ParentRelationshipsSection } from './parent-relationships-section';
import { Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import { formatMoroccanPhoneDisplay } from '@/features/admin/students/utils/normalize-moroccan-phone';
import { getGuardianEmailPresentation } from '@/features/admin/students/utils/guardian-email-presentation';
import { formatRoleLabels } from '@/features/admin/students/utils/person-role-presentation';
import { preferredLanguageLabel, parentAccountEntityFields } from '../utils/normalize-parent-profile';
import type { Parent } from '@/types/parent';

export function ParentProfileView({
  parent,
  editing,
  onEdit,
  onCancelEdit,
  onSaved,
  onReload,
}: {
  parent: Parent;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
  onReload: () => void;
}) {
  const t = useT();
  const router = useRouter();

  const roleLine = formatRoleLabels(parent.role_labels);
  const emailPresentation = getGuardianEmailPresentation(parent.email);
  const hasAccount =
    parent.account?.has_user_account === true ||
    !!(parent.has_user_account ?? parent.has_account);
  const showCreateAccount =
    parent.account?.needs_new_account === true ||
    (parent.needs_new_account === true && !hasAccount);
  const canArchive = parent.allowed_actions?.archive_guardian_profile === true;
  const accountEntity = parentAccountEntityFields(parent);
  const contactAddress =
    parent.street && parent.city
      ? `${parent.street}, ${parent.city}`
      : parent.street ?? parent.address?.trim() ?? null;

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
      <div className="parent-profile__header-actions row" style={{ gap: 8, marginBottom: 16 }}>
        <Badge tone={parent.status === 'active' ? 'green' : 'slate'}>{statusLabel(t, parent.status)}</Badge>
        {parent.needs_review ? <Badge tone="amber">{t('admin.student360.recordNeedsReview')}</Badge> : null}
        {parent.status !== 'archived' ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit}>
            {t('common.edit')}
          </button>
        ) : null}
        {canArchive ? (
          <ConfirmActionButton
            label={t('admin.student360.archiveGuardianProfile')}
            confirmMessage={t('admin.student360.archiveGuardianProfileConfirm')}
            path={endpoints.admin.parentArchive(parent.id)}
            variant="danger"
            onSuccess={() => router.push('/admin/parents')}
          />
        ) : null}
      </div>

      <div className="parent-profile__layout">
        <Card className="parent-profile__identity-card">
          <SectionHead title={t('admin.student360.guardianBasicInfo')} />
          <div className="parent-profile__identity">
            <h2 className="parent-profile__name" dir="auto">
              {parent.display_name ?? parent.name}
            </h2>
            {roleLine ? (
              <div className="parent-profile__roles">
                {parent.role_labels?.map((label) => (
                  <Badge key={label} tone="slate">
                    {label}
                  </Badge>
                ))}
              </div>
            ) : null}
            {hasAccount ? (
              <Badge tone="green">{t('admin.parentProfile.existingLoginAccount')}</Badge>
            ) : null}
            {hasAccount && roleLine ? (
              <p className="tiny muted">{t('admin.student360.singleLoginForRoles')}</p>
            ) : null}
          </div>
        </Card>

        <Card>
          <SectionHead title={t('admin.contact')} />
          <DefinitionList
            items={[
              {
                label: t('admin.phone'),
                value: parent.phone ? (
                  <span className="mono" dir="ltr">
                    {formatMoroccanPhoneDisplay(parent.phone)}
                  </span>
                ) : (
                  t('common.dash')
                ),
              },
              {
                label: t('admin.student360.mobile'),
                value: parent.mobile ? (
                  <span className="mono" dir="ltr">
                    {formatMoroccanPhoneDisplay(parent.mobile)}
                  </span>
                ) : (
                  t('common.dash')
                ),
              },
              {
                label: t('admin.email'),
                value:
                  emailPresentation.kind === 'usable' ? (
                    <span dir="ltr">{emailPresentation.email}</span>
                  ) : (
                    t('common.dash')
                  ),
              },
              {
                label: t('admin.student360.address'),
                value: contactAddress || t('common.dash'),
              },
              {
                label: t('admin.preferredLanguage'),
                value: preferredLanguageLabel(t, parent.preferred_language),
              },
              {
                label: t('admin.notificationOptIn'),
                value: parent.notification_opt_in ? t('common.yes') : t('common.no'),
              },
            ]}
          />
        </Card>

        <Card>
          <SectionHead title={t('admin.account.accountInformation')} />
          {hasAccount ? (
            <div className="col" style={{ gap: 8 }}>
              {roleLine ? (
                <p className="tiny muted">
                  {t('admin.parentProfile.currentRoles')}: {roleLine}
                </p>
              ) : null}
              <EntityAccountPanel
                entity={accountEntity}
                entityLabel={parent.name}
                accountEndpoint={endpoints.admin.parentAccount(parent.id)}
                managePermission="manage_parents"
                defaultEmail={emailPresentation.kind === 'usable' ? emailPresentation.email : ''}
                onAccountChanged={onReload}
              />
            </div>
          ) : showCreateAccount ? (
            <EntityAccountPanel
              entity={accountEntity}
              entityLabel={parent.name}
              accountEndpoint={endpoints.admin.parentAccount(parent.id)}
              managePermission="manage_parents"
              defaultEmail={emailPresentation.kind === 'usable' ? emailPresentation.email : ''}
              onAccountChanged={onReload}
            />
          ) : (
            <p className="muted">{t('admin.student360.noLoginAccount')}</p>
          )}
        </Card>

        <Card className="parent-profile__relationships-card">
          <ParentRelationshipsSection parent={parent} onRelationshipChanged={onReload} />
        </Card>
      </div>
    </div>
  );
}
