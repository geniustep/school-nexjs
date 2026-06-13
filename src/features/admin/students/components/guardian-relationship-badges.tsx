'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { GuardianRelationship } from '@/types/student-360';

export function GuardianRelationshipBadges({ rel }: { rel: GuardianRelationship }) {
  const t = useT();
  const badges: { key: string; label: string; tone: 'green' | 'blue' | 'amber' | 'slate' }[] = [];

  if (rel.is_primary_contact) {
    badges.push({ key: 'primary', label: t('admin.student360.primaryContact'), tone: 'green' });
  }
  if (rel.is_legal_guardian) {
    badges.push({ key: 'legal', label: t('admin.student360.legalGuardian'), tone: 'blue' });
  }
  if (rel.is_financial_responsible) {
    badges.push({ key: 'financial', label: t('admin.student360.financialResponsible'), tone: 'amber' });
  }
  if (rel.receives_notifications) {
    badges.push({ key: 'notif', label: t('admin.student360.receivesNotifications'), tone: 'slate' });
  }
  if (rel.is_emergency_contact) {
    badges.push({ key: 'emergency', label: t('admin.student360.emergencyContact'), tone: 'amber' });
  }
  if (rel.is_authorized_pickup) {
    badges.push({ key: 'pickup', label: t('admin.student360.authorizedPickup'), tone: 'slate' });
  }

  if (!badges.length) return null;

  return (
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      {badges.map((b) => (
        <Badge key={b.key} tone={b.tone}>
          {b.label}
        </Badge>
      ))}
    </div>
  );
}
