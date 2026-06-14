'use client';

import Link from 'next/link';
import { Badge, Card } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { GuardianRelationshipBadges } from './guardian-relationship-badges';
import { isRelationshipActive, relationshipTypeLabel } from '../utils/relationship-types';
import type { GuardianRelationship } from '@/types/student-360';

export function GuardianRelationshipCard({
  rel,
  canManage,
  onEdit,
  onEnd,
  onCopyPhone,
}: {
  rel: GuardianRelationship;
  canManage: boolean;
  onEdit: () => void;
  onEnd: () => void;
  onCopyPhone?: (phone: string) => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const active = isRelationshipActive(rel.state, rel.active);
  const phone = rel.guardian.phone?.trim();
  const email = rel.guardian.email?.trim();

  return (
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
            <a href={`tel:${phone}`} className="mono">
              {phone}
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
          <a href={`mailto:${email}`} className="student-360-guardian-card__email">
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
          <button type="button" className="btn btn--ghost btn--sm" onClick={onEnd}>
            {t('admin.student360.endRelationship')}
          </button>
        </div>
      ) : null}
    </Card>
  );
}
