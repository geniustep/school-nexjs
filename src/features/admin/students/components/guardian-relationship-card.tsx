'use client';

import { Badge, Card, SectionHead } from '@/components/ui/primitives';
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
}: {
  rel: GuardianRelationship;
  canManage: boolean;
  onEdit: () => void;
  onEnd: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const active = isRelationshipActive(rel.state, rel.active);

  return (
    <Card className={active ? '' : 'student-360-guardian-card--ended'}>
      <div className="between" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <div className="col" style={{ gap: 4 }}>
          <strong>{rel.guardian.name}</strong>
          <span className="tiny muted">
            {relationshipTypeLabel(t, rel.relationship_type)}
          </span>
        </div>
        <Badge tone={active ? 'green' : 'slate'}>
          {active ? t('admin.student360.relationshipActive') : t('admin.student360.relationshipEnded')}
        </Badge>
      </div>

      <div className="col tiny muted" style={{ gap: 4, marginBottom: 8 }}>
        {rel.guardian.phone && (
          <span>
            {t('admin.phone')}: <span className="mono">{rel.guardian.phone}</span>
          </span>
        )}
        {rel.guardian.email && <span>{t('admin.email')}: {rel.guardian.email}</span>}
        {rel.contact_priority != null && (
          <span>{t('admin.student360.contactPriority')}: {rel.contact_priority}</span>
        )}
        {rel.date_start && (
          <span>{t('admin.student360.dateStart')}: {formatDate(rel.date_start)}</span>
        )}
        {rel.date_end && (
          <span>{t('admin.student360.dateEnd')}: {formatDate(rel.date_end)}</span>
        )}
        {rel.notes && <span>{t('admin.student360.notes')}: {rel.notes}</span>}
      </div>

      <GuardianRelationshipBadges rel={rel} />

      {canManage && active && (
        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit}>
            {t('admin.student360.editRelationship')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onEnd}>
            {t('admin.student360.endRelationship')}
          </button>
        </div>
      )}
    </Card>
  );
}
