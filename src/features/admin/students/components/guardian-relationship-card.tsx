'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { CreateAccountDialog } from '@/features/admin/account/create-account-dialog';
import { GuardianPasswordAssignAction } from '@/features/admin/account/guardian-password-assign-action';
import { IconMoreHorizontal } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { resolveAccountStatus } from '@/lib/account/account-utils';
import type { AccountEntityFields } from '@/types/account';
import { initials } from '@/lib/utils/format';
import { GuardianRelationshipBadges } from './guardian-relationship-badges';
import { formatMoroccanPhoneDisplay } from '../utils/normalize-moroccan-phone';
import {
  getGuardianEmailPresentation,
  hasCompleteGuardianContact,
  hasUsableGuardianPhone,
} from '../utils/guardian-email-presentation';
import { canRemoveGuardianRelationship } from '../utils/normalize-guardian-relationship';
import { isRelationshipActive, relationshipTypeLabel } from '../utils/relationship-types';
import {
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
  const schoolRoleBadges = buildGuardianCardSchoolBadges(t, rel.guardian).slice(0, 1);
  const canRemove = canRemoveGuardianRelationship(rel, canManage) && active;
  const guardianAccountPresentation = resolveGuardianAccountPresentation(rel.guardian);
  const relationshipLine = relationshipTypeLabel(t, rel.relationship_type);

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

  const contactBits: string[] = [];
  if (hasPhone) contactBits.push(formatMoroccanPhoneDisplay(phone));
  if (hasSecondaryPhone) contactBits.push(formatMoroccanPhoneDisplay(secondaryPhone));
  if (hasUsableEmail) contactBits.push(emailPresentation.email);

  return (
    <>
      <article
        className={[
          'student-360-guardian-row',
          rel.is_primary_contact && active ? 'student-360-guardian-row--primary' : '',
          active ? '' : 'student-360-guardian-row--ended',
          menuOpen ? 'student-360-guardian-row--menu-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          className={`student-360-guardian-row__avatar${active ? '' : ' student-360-guardian-row__avatar--muted'}`}
          aria-hidden="true"
        >
          {initials(rel.guardian.name)}
        </div>

        <div className="student-360-guardian-row__body">
          <div className="student-360-guardian-row__top">
            <div className="student-360-guardian-row__identity">
              <Link
                href={`/admin/parents/${rel.guardian.id}`}
                className="student-360-guardian-row__name"
                dir="auto"
              >
                {rel.guardian.name}
              </Link>
              <div className="student-360-guardian-row__chips">
                <span className="student-360-guardian-row__chip student-360-guardian-row__chip--rel">
                  {relationshipLine}
                </span>
                {rel.is_primary_contact && active ? (
                  <span className="student-360-guardian-row__chip student-360-guardian-row__chip--primary">
                    {t('admin.student360.primaryGuardianShort')}
                  </span>
                ) : null}
                {!active ? (
                  <span className="student-360-guardian-row__chip student-360-guardian-row__chip--muted">
                    {t('admin.student360.relationshipEnded')}
                  </span>
                ) : null}
                {rel.needs_review ? (
                  <Badge tone="amber">{t('admin.student360.recordNeedsReview')}</Badge>
                ) : null}
                {schoolRoleBadges.map((badge) => (
                  <span
                    key={`${rel.relationship_id}-${badge.id}`}
                    className="student-360-guardian-row__chip student-360-guardian-row__chip--muted"
                  >
                    {badge.label}
                  </span>
                ))}
                {personHasLoginAccount(rel.guardian) &&
                !schoolRoleBadges.some((badge) => badge.id === 'login') &&
                !personHasTeacherRole(rel.guardian) ? (
                  <span className="student-360-guardian-row__chip student-360-guardian-row__chip--ok">
                    {t('admin.student360.schoolRoleHasLoginAccount')}
                  </span>
                ) : null}
              </div>
            </div>

            {canManage && active ? (
              <div className="student-360-guardian-row__actions">
                <button type="button" className="btn btn--secondary btn--sm" onClick={onEdit}>
                  {t('admin.student360.editRelationship')}
                </button>
                <div className="student-360-guardian-row__menu-wrap" ref={menuRef}>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm student-360-guardian-row__more"
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    aria-label={t('admin.student360.guardiansMoreActions')}
                    onClick={() => setMenuOpen((v) => !v)}
                  >
                    <IconMoreHorizontal aria-hidden="true" />
                  </button>
                  {menuOpen ? (
                    <div className="student-360-guardian-row__menu" role="menu">
                      <Link
                        href={`/admin/parents/${rel.guardian.id}`}
                        className="student-360-guardian-row__menu-item"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                      >
                        {t('admin.student360.guardiansOpenProfile')}
                      </Link>
                      {!contactComplete ? (
                        <Link
                          href={`/admin/parents/${rel.guardian.id}`}
                          className="student-360-guardian-row__menu-item"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                        >
                          {t('admin.student360.guardiansCompleteProfile')}
                        </Link>
                      ) : null}
                      {hasAccount || !showCreateAccount ? (
                        <Link
                          href={`/admin/parents/${rel.guardian.id}`}
                          className="student-360-guardian-row__menu-item"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                        >
                          {t('admin.student360.guardiansManageLoginAccount')}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="student-360-guardian-row__menu-item"
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false);
                            setAccountDialogOpen(true);
                          }}
                        >
                          {t('admin.student360.guardiansCreateLoginForGuardian')}
                        </button>
                      )}
                      <GuardianPasswordAssignAction
                        guardianId={rel.guardian.id}
                        guardianName={rel.guardian.name}
                        account={rel.guardian.account}
                        onAccountUpdated={() => {
                          setMenuOpen(false);
                          onAccountChanged?.();
                        }}
                        buttonClassName="student-360-guardian-row__menu-item"
                      />
                      {canRemove ? (
                        <button
                          type="button"
                          className="student-360-guardian-row__menu-item student-360-guardian-row__menu-item--danger"
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
            ) : (
              <Link
                href={`/admin/parents/${rel.guardian.id}`}
                className="btn btn--ghost btn--sm student-360-guardian-row__profile-link"
              >
                {t('admin.student360.guardiansOpenProfile')}
              </Link>
            )}
          </div>

          <div className="student-360-guardian-row__meta">
            {!contactComplete ? (
              <span className="student-360-guardian-row__meta-warn">
                {t('admin.student360.guardiansContactIncompleteTitle')}
              </span>
            ) : contactBits.length > 0 ? (
              <div className="student-360-guardian-row__contact-block">
                {hasPhone ? (
                  <span className="student-360-guardian-row__phone">
                    <a href={`tel:${phone}`} className="student-360-guardian-row__contact-link mono" dir="ltr">
                      {formatMoroccanPhoneDisplay(phone)}
                    </a>
                    {onCopyPhone ? (
                      <button
                        type="button"
                        className="student-360-guardian-row__copy"
                        onClick={() => onCopyPhone(phone)}
                      >
                        {t('admin.student360.guardiansCopyPhone')}
                      </button>
                    ) : null}
                  </span>
                ) : null}
                {hasSecondaryPhone ? (
                  <a
                    href={`tel:${secondaryPhone}`}
                    className="student-360-guardian-row__contact-link mono"
                    dir="ltr"
                  >
                    {formatMoroccanPhoneDisplay(secondaryPhone)}
                  </a>
                ) : null}
                {hasUsableEmail ? (
                  <a
                    href={`mailto:${emailPresentation.email}`}
                    className="student-360-guardian-row__contact-link"
                    dir="ltr"
                  >
                    {emailPresentation.email}
                  </a>
                ) : null}
              </div>
            ) : (
              <span className="student-360-guardian-row__meta-muted">
                {t('admin.student360.guardiansEmailUnavailable')}
              </span>
            )}

            {guardianAccountPresentation.hasVisibleAccountInfo ? (
              <span className="student-360-guardian-row__account">
                <span className="student-360-guardian-row__account-status">
                  {t(guardianAccountPresentation.statusLabelKey)}
                </span>
                {guardianAccountPresentation.code ? (
                  <span className="student-360-guardian-row__account-code mono" dir="ltr">
                    {guardianAccountPresentation.code}
                  </span>
                ) : null}
              </span>
            ) : !hasAccount ? (
              <span className="student-360-guardian-row__account student-360-guardian-row__account--empty">
                {t('admin.guardianAccount.status.noAccount')}
              </span>
            ) : null}
          </div>

          <GuardianRelationshipBadges rel={rel} isDefaultBilling={isDefaultBilling} compactSummary />
        </div>
      </article>

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
