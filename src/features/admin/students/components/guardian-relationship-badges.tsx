'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { GuardianRelationship } from '@/types/student-360';

type BadgeTone = 'green' | 'blue' | 'amber' | 'slate';

interface ResponsibilityBadge {
  key: string;
  label: string;
  tone: BadgeTone;
  group: 'role' | 'permissions';
}

function collectBadges(rel: GuardianRelationship, t: (k: string) => string): ResponsibilityBadge[] {
  const badges: ResponsibilityBadge[] = [];

  if (rel.is_primary_contact) {
    badges.push({ key: 'primary', label: t('admin.student360.primaryContact'), tone: 'green', group: 'role' });
  }
  if (rel.is_legal_guardian) {
    badges.push({ key: 'legal', label: t('admin.student360.legalGuardian'), tone: 'blue', group: 'role' });
  }
  if (rel.is_financial_responsible) {
    badges.push({ key: 'financial', label: t('admin.student360.financialResponsible'), tone: 'amber', group: 'role' });
  }
  if (rel.is_emergency_contact) {
    badges.push({
      key: 'emergency',
      label: t('admin.student360.emergencyContact'),
      tone: 'amber',
      group: 'permissions',
    });
  }
  if (rel.receives_notifications) {
    badges.push({
      key: 'notif',
      label: t('admin.student360.receivesNotifications'),
      tone: 'slate',
      group: 'permissions',
    });
  }
  if (rel.is_authorized_pickup) {
    badges.push({
      key: 'pickup',
      label: t('admin.student360.authorizedPickup'),
      tone: 'slate',
      group: 'permissions',
    });
  }

  return badges;
}

function BadgeGroup({ title, badges }: { title: string; badges: ResponsibilityBadge[] }) {
  if (!badges.length) return null;
  return (
    <div className="student-360-guardian-card__badge-group">
      <p className="student-360-guardian-card__badge-group-title">{title}</p>
      <div className="student-360-guardian-card__badges">
        {badges.map((b) => (
          <Badge key={b.key} tone={b.tone}>
            {b.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function GuardianRelationshipBadges({
  rel,
  isDefaultBilling,
  compactSummary = false,
}: {
  rel: GuardianRelationship;
  isDefaultBilling?: boolean;
  compactSummary?: boolean;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const badges = collectBadges(rel, t);

  if (isDefaultBilling && !rel.is_financial_responsible) {
    badges.unshift({
      key: 'billing',
      label: t('admin.student360.defaultBillingParty'),
      tone: 'blue',
      group: 'role',
    });
  }

  if (!badges.length) return null;

  const roleBadges = badges.filter((b) => b.group === 'role');
  const permissionBadges = badges.filter((b) => b.group === 'permissions');
  const preview = badges.slice(0, 3);
  const hiddenCount = badges.length - preview.length;

  if (compactSummary) {
    return (
      <div className="student-360-guardian-card__responsibilities">
        <div className="student-360-guardian-card__badges">
          {preview.map((b) => (
            <Badge key={b.key} tone={b.tone}>
              {b.label}
            </Badge>
          ))}
        </div>
        {hiddenCount > 0 ? (
          <span className="tiny muted" title={badges.map((b) => b.label).join(' · ')}>
            {t('admin.parentProfile.moreResponsibilities', { count: hiddenCount })}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="student-360-guardian-card__responsibilities">
      {!expanded ? (
        <>
          <div className="student-360-guardian-card__badges">
            {preview.map((b) => (
              <Badge key={b.key} tone={b.tone}>
                {b.label}
              </Badge>
            ))}
          </div>
          {hiddenCount > 0 ? (
            <button type="button" className="btn btn--ghost btn--sm student-360-guardian-card__expand" onClick={() => setExpanded(true)}>
              {t('admin.student360.guardiansShowAllResponsibilities', { count: badges.length })}
            </button>
          ) : null}
        </>
      ) : (
        <>
          <BadgeGroup title={t('admin.student360.guardiansRoleGroup')} badges={roleBadges} />
          <BadgeGroup title={t('admin.student360.guardiansPermissionsGroup')} badges={permissionBadges} />
          <button type="button" className="btn btn--ghost btn--sm student-360-guardian-card__expand" onClick={() => setExpanded(false)}>
            {t('admin.student360.guardiansHideResponsibilities')}
          </button>
        </>
      )}
    </div>
  );
}
