'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge, Card } from '@/components/ui/primitives';
import { AccountStatusBadge } from '@/features/admin/account/account-status-badge';
import { CreateAccountDialog } from '@/features/admin/account/create-account-dialog';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { resolveAccountStatus } from '@/lib/account/account-utils';
import { GuardianRelationshipBadges } from './guardian-relationship-badges';
import { formatMoroccanPhoneDisplay } from '../utils/normalize-moroccan-phone';
import {
  getGuardianEmailPresentation,
  hasCompleteGuardianContact,
  hasUsableGuardianPhone,
} from '../utils/guardian-email-presentation';
import { isRelationshipActive, relationshipTypeLabel } from '../utils/relationship-types';
import type { GuardianRelationship } from '@/types/student-360';

export function GuardianRelationshipCard({
  rel,
  canManage,
  isDefaultBilling,
  onEdit,
  onEnd,
  onCopyPhone,
  onAccountChanged,
}: {
  rel: GuardianRelationship;
  canManage: boolean;
  isDefaultBilling?: boolean;
  onEdit: () => void;
  onEnd: () => void;
  onCopyPhone?: (phone: string) => void;
  onAccountChanged?: () => void;
}) {
  const t = useT();
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountDialogMode, setAccountDialogMode] = useState<'create' | 'reset'>('create');
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
    id: rel.guardian.id,
    has_account: rel.guardian.has_account,
    account: rel.guardian.account ?? null,
    email: hasUsableEmail ? emailPresentation.email : null,
  };
  const accountStatus = resolveAccountStatus(accountEntity);
  const hasAccount = accountStatus !== 'not_created';

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
    setAccountDialogMode('create');
    setAccountDialogOpen(true);
  }

  function openResetPassword() {
    setAccountDialogMode('reset');
    setAccountDialogOpen(true);
  }

  const relationshipParts = [relationshipTypeLabel(t, rel.relationship_type)];
  if (rel.is_primary_contact) relationshipParts.push(t('admin.student360.primaryGuardianShort'));
  if (rel.is_financial_responsible && isDefaultBilling) {
    relationshipParts.push(t('admin.student360.financialAndDefaultBilling'));
  } else if (isDefaultBilling) {
    relationshipParts.push(t('admin.student360.defaultBillingPartyShort'));
  }
  const relationshipLine = relationshipParts.join(' · ');

  return (
    <>
      <Card
        className={[
          'student-360-guardian-card',
          rel.is_primary_contact && active ? 'student-360-guardian-card--primary' : '',
          active ? '' : 'student-360-guardian-card--ended',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="student-360-guardian-card__head">
          <div className="student-360-guardian-card__identity">
            <Link href={`/admin/parents/${rel.guardian.id}`} className="student-360-guardian-card__name" dir="auto">
              {rel.guardian.name}
            </Link>
            <p className="student-360-guardian-card__meta tiny muted">{relationshipLine}</p>
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
                  <a href={`tel:${phone}`} className="mono" dir="ltr">
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
                  <span className="tiny muted">{t('admin.student360.secondaryPhone')}</span>
                  <a href={`tel:${secondaryPhone}`} className="mono" dir="ltr">
                    {formatMoroccanPhoneDisplay(secondaryPhone)}
                  </a>
                </div>
              ) : null}
              {hasUsableEmail ? (
                <div className="student-360-guardian-card__contact-row">
                  <a href={`mailto:${emailPresentation.email}`} className="student-360-guardian-card__email" dir="ltr">
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
          <AccountStatusBadge entity={accountEntity} showLogin={hasAccount} />
        </div>

        {canManage && active ? (
          <div className="student-360-guardian-card__actions">
            <Link href={`/admin/parents/${rel.guardian.id}`} className="btn btn--primary btn--sm">
              {t('admin.student360.guardiansOpenProfile')}
            </Link>
            <button type="button" className="btn btn--secondary btn--sm" onClick={onEdit}>
              {t('admin.student360.editRelationship')}
            </button>
            {hasAccount ? (
              <Link href={`/admin/parents/${rel.guardian.id}`} className="btn btn--ghost btn--sm">
                {t('admin.student360.guardiansManageLoginAccount')}
              </Link>
            ) : (
              <button type="button" className="btn btn--ghost btn--sm" onClick={openCreateAccount}>
                {t('admin.student360.guardiansCreateLoginAccount')}
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
                  <button
                    type="button"
                    className="student-360-guardian-card__menu-item"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      openResetPassword();
                    }}
                  >
                    {t('admin.student360.guardiansSetNewPassword')}
                  </button>
                  <button
                    type="button"
                    className="student-360-guardian-card__menu-item student-360-guardian-card__menu-item--danger"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onEnd();
                    }}
                  >
                    {t('admin.student360.endRelationship')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>

      {canManage && active ? (
        <CreateAccountDialog
          open={accountDialogOpen}
          title={
            accountDialogMode === 'reset'
              ? t('admin.student360.guardiansResetPasswordTitle', { name: rel.guardian.name })
              : t('admin.student360.guardiansCreateLoginAccountTitle', { name: rel.guardian.name })
          }
          submitLabel={
            accountDialogMode === 'reset'
              ? t('admin.student360.guardiansSetNewPassword')
              : t('admin.student360.guardiansCreateLoginSubmit')
          }
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
