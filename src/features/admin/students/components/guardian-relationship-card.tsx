'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Card } from '@/components/ui/primitives';
import { CreateAccountDialog } from '@/features/admin/account/create-account-dialog';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { GuardianRelationshipBadges } from './guardian-relationship-badges';
import { formatMoroccanPhoneDisplay } from '../utils/normalize-moroccan-phone';
import { isRelationshipActive, relationshipTypeLabel } from '../utils/relationship-types';
import type { GuardianRelationship } from '@/types/student-360';

export function GuardianRelationshipCard({
  rel,
  canManage,
  onEdit,
  onEnd,
  onCopyPhone,
  onAccountCreated,
}: {
  rel: GuardianRelationship;
  canManage: boolean;
  onEdit: () => void;
  onEnd: () => void;
  onCopyPhone?: (phone: string) => void;
  onAccountCreated?: () => void;
}) {
  const t = useT();
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const active = isRelationshipActive(rel.state, rel.active);
  const phone = rel.guardian.phone?.trim();
  const email = rel.guardian.email?.trim();
  const hasAccount = rel.guardian.has_account === true;

  return (
    <>
      <Card className={`student-360-guardian-card${active ? '' : ' student-360-guardian-card--ended'}`}>
        <div className="student-360-guardian-card__head">
          <div>
            <Link href={`/admin/parents/${rel.guardian.id}`} className="student-360-guardian-card__name">
              {rel.guardian.name}
            </Link>
            <span className="tiny muted">{relationshipTypeLabel(t, rel.relationship_type)}</span>
          </div>
          <Badge tone={active ? 'green' : 'slate'}>
            {active ? t('admin.student360.relationshipActive') : t('admin.student360.relationshipEnded')}
          </Badge>
        </div>

        <div className="student-360-guardian-card__contact">
          {phone ? (
            <div className="student-360-guardian-card__contact-row">
              <a href={`tel:${phone}`} className="mono" dir="ltr">
                {formatMoroccanPhoneDisplay(phone)}
              </a>
              {onCopyPhone ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => onCopyPhone(phone)}
                >
                  {t('admin.student360.guardiansCopyPhone')}
                </button>
              ) : null}
            </div>
          ) : null}
          {email ? (
            <a href={`mailto:${email}`} className="student-360-guardian-card__email" dir="ltr">
              {email}
            </a>
          ) : null}
        </div>

        <GuardianRelationshipBadges rel={rel} />

        {canManage && active ? (
          <div className="student-360-guardian-card__actions">
            <Link href={`/admin/parents/${rel.guardian.id}`} className="btn btn--ghost btn--sm">
              {t('admin.student360.guardiansOpenProfile')}
            </Link>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit}>
              {t('admin.student360.editRelationship')}
            </button>
            {!hasAccount ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setAccountDialogOpen(true)}
              >
                {t('admin.account.createAccount')}
              </button>
            ) : null}
            <button type="button" className="btn btn--ghost btn--sm" onClick={onEnd}>
              {t('admin.student360.endRelationship')}
            </button>
          </div>
        ) : null}
      </Card>

      {canManage && active ? (
        <CreateAccountDialog
          open={accountDialogOpen}
          title={t('admin.account.activateAccountTitle', { name: rel.guardian.name })}
          endpoint={endpoints.admin.parentAccount(rel.guardian.id)}
          defaultEmail={email ?? ''}
          onClose={() => setAccountDialogOpen(false)}
          onSuccess={() => {
            setAccountDialogOpen(false);
            onAccountCreated?.();
          }}
        />
      ) : null}
    </>
  );
}
