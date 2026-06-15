'use client';

import './parent-profile.css';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { EntityAccountPanel } from '@/features/admin/account/entity-account-panel';
import { ParentForm } from '@/features/admin/entity-forms';
import { GuardianRemoveDialog } from '@/features/admin/students/components/guardian-remove-dialog';
import { Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import { formatMoroccanPhoneDisplay } from '@/features/admin/students/utils/normalize-moroccan-phone';
import { getGuardianEmailPresentation } from '@/features/admin/students/utils/guardian-email-presentation';
import { relationshipTypeLabel } from '@/features/admin/students/utils/relationship-types';
import { formatRoleLabels } from '@/features/admin/students/utils/person-role-presentation';
import { preferredLanguageLabel, parentAccountEntityFields } from '../utils/normalize-parent-profile';
import type { Parent, ParentChild } from '@/types/parent';

function childClassLabel(child: ParentChild, dash: string): string {
  const classRef = child.class as { display_name?: string; name?: string } | null;
  const levelRef = child.level as { display_name?: string; name?: string; display_alias?: string } | null;
  const className = classRef?.display_name ?? classRef?.name;
  const levelName = levelRef?.display_name ?? levelRef?.name ?? levelRef?.display_alias;
  if (className && levelName) return `${className} · ${levelName}`;
  return className ?? levelName ?? dash;
}

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
  const [removeContext, setRemoveContext] = useState<{
    studentId: number;
    relationshipId: number;
    relationship: import('@/types/student-360').GuardianRelationship;
  } | null>(null);

  const roleLine = formatRoleLabels(parent.role_labels);
  const emailPresentation = getGuardianEmailPresentation(parent.email);
  const hasAccount = parent.account?.has_user_account === true || !!(parent.has_user_account ?? parent.has_account);
  const showCreateAccount =
    parent.account?.needs_new_account === true ||
    (parent.needs_new_account === true && !hasAccount);
  const canArchive = parent.allowed_actions?.archive_guardian_profile === true;
  const accountEntity = parentAccountEntityFields(parent);

  function buildRemoveRelationship(child: ParentChild) {
    const rel = child.relationship;
    if (!rel?.relationship_id) return;
    setRemoveContext({
      studentId: child.id,
      relationshipId: rel.relationship_id,
      relationship: {
        relationship_id: rel.relationship_id,
        guardian: {
          id: parent.id,
          name: parent.name,
          phone: parent.phone,
          email: parent.email,
          role_labels: parent.role_labels,
          existing_roles: parent.existing_roles,
          has_account: hasAccount,
          has_user_account: hasAccount,
        },
        relationship_type: rel.relationship_type ?? 'other',
        is_primary_contact: rel.is_primary_contact ?? false,
        is_legal_guardian: rel.is_legal_guardian ?? false,
        is_financial_responsible: rel.is_financial_responsible ?? false,
        receives_notifications: rel.receives_notifications ?? true,
        is_emergency_contact: rel.is_emergency_contact ?? false,
        is_authorized_pickup: rel.is_authorized_pickup ?? false,
        state: rel.state ?? 'active',
        active: rel.active !== false,
        allowed_actions: rel.allowed_actions,
        removal_impact: rel.removal_impact,
      },
    });
  }

  if (editing) {
    return (
      <ParentForm
        parent={parent}
        onSaved={() => {
          onSaved();
        }}
        onCancel={onCancelEdit}
      />
    );
  }

  return (
    <>
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

      <div className="grid grid--cards">
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
                label: t('admin.email'),
                value:
                  emailPresentation.kind === 'usable' ? (
                    <span dir="ltr">{emailPresentation.email}</span>
                  ) : (
                    t('common.dash')
                  ),
              },
              {
                label: t('admin.address'),
                value: parent.address?.trim() || t('common.dash'),
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
              <Badge tone="green">{t('admin.student360.hasLoginAccount')}</Badge>
              {roleLine ? (
                <p className="tiny muted">
                  {t('admin.student360.accountRoles')}: {roleLine}
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

        <Card className="parent-profile__children-card">
          <SectionHead title={t('admin.linkedChildren')} />
          {(parent.relationships ?? parent.children ?? []).length ? (
            <ul className="parent-profile__children-list">
              {(parent.relationships ?? parent.children ?? []).map((child) => {
                const relType = child.relationship?.relationship_type;
                const relLabel = relType ? relationshipTypeLabel(t, relType) : null;
                const studentName = getStudentDisplayName(child);
                const canRemoveChild =
                  child.relationship?.relationship_id != null &&
                  child.relationship?.allowed_actions?.remove_relationship !== false &&
                  child.relationship?.state !== 'ended';

                return (
                  <li key={child.id} className="parent-profile__child-row">
                    <div className="parent-profile__child-main">
                      <Link href={`/admin/students/${child.id}`} className="parent-profile__child-name" dir="auto">
                        {studentName}
                      </Link>
                      {child.code || child.school_number ? (
                        <span className="tiny mono muted" dir="ltr">
                          {child.code ?? child.school_number}
                        </span>
                      ) : null}
                      <span className="tiny muted">{childClassLabel(child, t('common.dash'))}</span>
                      {relLabel ? (
                        <span className="tiny muted">
                          {t('admin.student360.relationshipTypeLabel')}: {relLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="parent-profile__child-actions">
                      <Link href={`/admin/students/${child.id}?tab=guardians`} className="btn btn--ghost btn--sm">
                        {t('admin.student360.guardiansOpenStudentProfile')}
                      </Link>
                      {canRemoveChild ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm parent-profile__remove-btn"
                          onClick={() => buildRemoveRelationship(child)}
                        >
                          {t('admin.student360.removeGuardianFromStudent')}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">{t('admin.noLinkedChildren')}</p>
          )}
        </Card>
      </div>

      {removeContext ? (
        <GuardianRemoveDialog
          open
          studentId={removeContext.studentId}
          relationship={removeContext.relationship}
          onClose={() => setRemoveContext(null)}
          onRemoved={() => {
            setRemoveContext(null);
            onReload();
          }}
        />
      ) : null}
    </>
  );
}
