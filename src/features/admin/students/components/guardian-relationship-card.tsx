'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge, Card } from '@/components/ui/primitives';
import { AccountStatusBadge } from '@/features/admin/account/account-status-badge';
import { CreateAccountDialog } from '@/features/admin/account/create-account-dialog';
import { GuardianPasswordAssignAction } from '@/features/admin/account/guardian-password-assign-action';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { resolveAccountStatus } from '@/lib/account/account-utils';
import type { AccountEntityFields } from '@/types/account';
import { initials } from '@/lib/utils/format';
import { GuardianRelationshipBadges } from './guardian-relationship-badges';
import { GuardianAccountOnboardingPanel } from './guardian-account-onboarding-panel';
import { formatMoroccanPhoneDisplay } from '../utils/normalize-moroccan-phone';
import {
  getGuardianEmailPresentation,
  hasCompleteGuardianContact,
  hasUsableGuardianPhone,
} from '../utils/guardian-email-presentation';
import { canRemoveGuardianRelationship } from '../utils/normalize-guardian-relationship';
import { isRelationshipActive, relationshipTypeLabel } from '../utils/relationship-types';
import {
  formatRoleLabels,
  needsNewAccountFromLink,
  personHasTeacherRole,
} from '../utils/person-role-presentation';
import {
  buildGuardianCardSchoolBadges,
  personHasLoginAccount,
} from '../utils/person-school-identity';
import { resolveGuardianAccountPresentation } from '../utils/resolve-guardian-account-presentation';
import type { GuardianRelationship } from '@/types/student-360';

export function GuardianRelationshipCard({
  rel,
  canManage,
  isDefaultBilling,
  onEdit,
  onRemove,
  onCopyPhone,
  onAccountChanged,
}: {
  rel: GuardianRelationship;
  canManage: boolean;
  isDefaultBilling?: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onCopyPhone?: (phone: string) => void;
  onAccountChanged?: () => void;
}) {
  const t = useT();
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const active = isRelationshipActive(rel.state, rel.active);
  const phone = rel.guardian.phone?.trim() || '';
  const secondaryPhone = rel.guardian.secondary_phone?.trim() || '';
  const emailPresentation = getGuardianEmailPresentation(rel.guardian.email);
  const hasPhone = hasUsableGuardianPhone(phone);
  const hasSecondaryPhone = hasUsableGuardianPhone(secondaryPhone);
  const hasUsableEmail = emailPresentation.kind === 'usable';
  const contactComplete = hasCompleteGuardianContact(phone, secondaryPhone, rel.guardian.email);
  const accountEntity = {
    has_account: rel.guardian.has_account ?? rel.guardian.has_user_account,
    account:
      rel.guardian.account && 'user_id' in rel.guardian.account
        ? rel.guardian.account
        : null,
    email: hasUsableEmail ? emailPresentation.email : null,
  } as AccountEntityFields;
  const accountStatus = resolveAccountStatus(accountEntity);
  const hasAccount = accountStatus !== 'not_created';
  const showCreateAccount = needsNewAccountFromLink(undefined, hasAccount);
  const schoolRoleBadges = buildGuardianCardSchoolBadges(t, rel.guardian);
  const rolesLine = formatRoleLabels(rel.guardian.role_labels ?? []);
  const isMultiRole = schoolRoleBadges.length > 0 || personHasTeacherRole(rel.guardian);
  const canRemove = canRemoveGuardianRelationship(rel, canManage) && active;
  const guardianAccountPresentation = resolveGuardianAccountPresentation(rel.guardian);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  function openCreateAccount() {
    setAccountDialogOpen(true);
  }

  const relationshipLine = relationshipTypeLabel(t, rel.relationship_type);

  return (
    <>
      <Card
        className={[
          'student-360-guardian-card',
          rel.is_primary_contact && active ? 'student-360-guardian-card--primary' : '',
          active ? '' : 'student-360-guardian-card--ended',
          menuOpen ? 'student-360-guardian-card--menu-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {rel.is_primary_contact && active ? (
          <div className="student-360-guardian-card__accent" aria-hidden="true" />
        ) : null}

        <div className="student-360-guardian-card__layout">
          <div
            className={`student-360-guardian-card__avatar${active ? '' : ' student-360-guardian-card__avatar--muted'}`}
            aria-hidden="true"
          >
            {initials(rel.guardian.name)}
          </div>

          <div className="student-360-guardian-card__main">
            <div className="student-360-guardian-card__head">
              <div className="student-360-guardian-card__identity">
                <Link href={`/admin/parents/${rel.guardian.id}`} className="student-360-guardian-card__name" dir="auto">
                  {rel.guardian.name}
                </Link>
                <div className="student-360-guardian-card__role-badges">
                  <Badge tone="blue">{relationshipLine}</Badge>
                  {schoolRoleBadges.map((badge) => (
                    <Badge key={`${rel.relationship_id}-${badge.id}`} tone="slate">
                      {badge.label}
                    </Badge>
                  ))}
                  {personHasLoginAccount(rel.guardian) &&
                  !schoolRoleBadges.some((badge) => badge.id === 'login') ? (
                    <Badge tone="green">{t('admin.student360.schoolRoleHasLoginAccount')}</Badge>
                  ) : null}
                </div>
                {rel.is_primary_contact ? (
                  <p className="student-360-guardian-card__meta tiny muted">
                    {t('admin.student360.primaryGuardianShort')}
                  </p>
                ) : null}
                {rel.needs_review ? (
                  <Badge tone="amber">{t('admin.student360.recordNeedsReview')}</Badge>
                ) : null}
              </div>
              <Badge tone={active ? 'green' : 'slate'}>
                {active ? t('admin.student360.relationshipActive') : t('admin.student360.relationshipEnded')}
              </Badge>
            </div>

            <div className="student-360-guardian-card__contact">
              {!contactComplete ? (
                <div className="student-360-guardian-card__contact-empty">
                  <p className="student-360-guardian-card__contact-empty-title">
                    {t('admin.student360.guardiansContactIncompleteTitle')}
                  </p>
                  <p className="tiny muted">{t('admin.student360.guardiansContactIncompleteDesc')}</p>
                  {canManage && active ? (
                    <Link href={`/admin/parents/${rel.guardian.id}`} className="btn btn--secondary btn--sm">
                      {t('admin.student360.guardiansCompleteProfile')}
                    </Link>
                  ) : null}
                </div>
              ) : (
                <>
                  {hasPhone ? (
                    <div className="student-360-guardian-card__contact-row">
                      <a href={`tel:${phone}`} className="mono student-360-guardian-card__contact-value" dir="ltr">
                        {formatMoroccanPhoneDisplay(phone)}
                      </a>
                      {onCopyPhone ? (
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onCopyPhone(phone)}>
                          {t('admin.student360.guardiansCopyPhone')}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {hasSecondaryPhone ? (
                    <div className="student-360-guardian-card__contact-row">
                      <span className="student-360-guardian-card__contact-label">{t('admin.student360.secondaryPhone')}</span>
                      <a href={`tel:${secondaryPhone}`} className="mono student-360-guardian-card__contact-value" dir="ltr">
                        {formatMoroccanPhoneDisplay(secondaryPhone)}
                      </a>
                    </div>
                  ) : null}
                  {hasUsableEmail ? (
                    <div className="student-360-guardian-card__contact-row">
                      <a href={`mailto:${emailPresentation.email}`} className="student-360-guardian-card__email student-360-guardian-card__contact-value" dir="ltr">
                        {emailPresentation.email}
                      </a>
                    </div>
                  ) : emailPresentation.kind === 'hidden_technical' ? (
                    <p className="tiny muted">{t('admin.student360.guardiansNoValidEmail')}</p>
                  ) : hasPhone ? (
                    <p className="tiny muted">{t('admin.student360.guardiansEmailUnavailable')}</p>
                  ) : null}
                </>
              )}
            </div>

            <GuardianRelationshipBadges rel={rel} isDefaultBilling={isDefaultBilling} />

            <div className="student-360-guardian-card__account">
              {guardianAccountPresentation.hasVisibleAccountInfo ? (
                <GuardianAccountOnboardingPanel
                  presentation={guardianAccountPresentation}
                  title={t('admin.guardianAccount.sectionTitle')}
                  compact
                />
              ) : hasAccount ? (
                <>
                  {rolesLine && !schoolRoleBadges.length ? (
                    <p className="tiny muted">
                      {t('admin.student360.accountRoles')}: {rolesLine}
                    </p>
                  ) : null}
                  {isMultiRole && hasAccount ? (
                    <p className="tiny muted">{t('admin.student360.singleLoginForRoles')}</p>
                  ) : null}
                </>
              ) : (
                <AccountStatusBadge entity={accountEntity} showLogin={false} />
              )}
              {guardianAccountPresentation.hasVisibleAccountInfo && hasAccount && isMultiRole ? (
                <p className="tiny muted">{t('admin.student360.singleLoginForRoles')}</p>
              ) : null}
              {canManage && active ? (
                <GuardianPasswordAssignAction
                  guardianId={rel.guardian.id}
                  guardianName={rel.guardian.name}
                  account={rel.guardian.account}
                  onAccountUpdated={() => onAccountChanged?.()}
                  buttonClassName="btn btn--secondary btn--sm"
                />
              ) : null}
            </div>
          </div>
        </div>

        {canManage && active ? (
          <div className="student-360-guardian-card__actions">
            <Link href={`/admin/parents/${rel.guardian.id}`} className="btn btn--primary btn--sm">
              {t('admin.student360.guardiansOpenProfile')}
            </Link>
            <button type="button" className="btn btn--secondary btn--sm" onClick={onEdit}>
              {t('admin.student360.editRelationship')}
            </button>
            {hasAccount || !showCreateAccount ? (
              <Link href={`/admin/parents/${rel.guardian.id}`} className="btn btn--ghost btn--sm">
                {t('admin.student360.guardiansManageLoginAccount')}
              </Link>
            ) : (
              <button type="button" className="btn btn--ghost btn--sm" onClick={openCreateAccount}>
                {t('admin.student360.guardiansCreateLoginForGuardian')}
              </button>
            )}
            <div className="student-360-guardian-card__menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                {t('admin.student360.guardiansMoreActions')}
              </button>
              {menuOpen ? (
                <div className="student-360-guardian-card__menu" role="menu">
                  <Link
                    href={`/admin/parents/${rel.guardian.id}`}
                    className="student-360-guardian-card__menu-item"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('admin.student360.guardiansCompleteProfile')}
                  </Link>
                  <GuardianPasswordAssignAction
                    guardianId={rel.guardian.id}
                    guardianName={rel.guardian.name}
                    account={rel.guardian.account}
                    onAccountUpdated={() => {
                      setMenuOpen(false);
                      onAccountChanged?.();
                    }}
                    buttonClassName="student-360-guardian-card__menu-item"
                  />
                  {canRemove ? (
                    <button
                      type="button"
                      className="student-360-guardian-card__menu-item student-360-guardian-card__menu-item--danger"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onRemove();
                      }}
                    >
                      {t('admin.student360.detachRelationship')}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>

      {canManage && active && (showCreateAccount || accountDialogOpen) ? (
        <CreateAccountDialog
          open={accountDialogOpen}
          title={t('admin.student360.guardiansCreateLoginAccountTitle', { name: rel.guardian.name })}
          submitLabel={t('admin.student360.guardiansCreateLoginSubmit')}
          submittingLabel={t('admin.account.creatingAccount')}
          endpoint={endpoints.admin.parentAccount(rel.guardian.id)}
          defaultEmail={hasUsableEmail ? emailPresentation.email : ''}
          onClose={() => setAccountDialogOpen(false)}
          onSuccess={() => {
            setAccountDialogOpen(false);
            onAccountChanged?.();
          }}
        />
      ) : null}
    </>
  );
}
