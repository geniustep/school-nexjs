'use client';

import { Avatar, Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  formatStaffRoleLine,
  formatStaffLoginLine,
} from '@/features/admin/academic-setup/utils/staff-present';
import {
  isStaffInactive,
  resolveStaffLogin,
} from '@/features/admin/academic-setup/utils/staff-utils';
import { StaffCardActions } from '@/features/admin/academic-setup/components/staff-card-actions';
import type { StaffMember } from '@/types/academic-setup';

function staffStatusBadge(member: StaffMember, t: (key: string) => string) {
  if (isStaffInactive(member)) {
    return (
      <Badge tone="amber">{t('admin.academicSetup.staffAccountInactive')}</Badge>
    );
  }
  if (member.account_status === 'suspended') {
    return (
      <Badge tone="red">{t('admin.account.accountSuspended')}</Badge>
    );
  }
  return (
    <Badge tone="green">{t('admin.academicSetup.staffAccountActive')}</Badge>
  );
}

export function StaffCardGrid({
  members,
  selectedId,
  canManage = false,
  onSelect,
  onReactivate,
  onDeactivate,
}: {
  members: StaffMember[];
  selectedId?: number | null;
  canManage?: boolean;
  onSelect?: (id: number) => void;
  onReactivate?: (member: StaffMember) => void;
  onDeactivate?: (member: StaffMember) => void;
}) {
  const t = useT();

  return (
    <div className="academic-staff-grid">
      {members.map((member) => {
        const login = formatStaffLoginLine(resolveStaffLogin(member));
        const inactive = isStaffInactive(member);
        const roleLine = formatStaffRoleLine(member, t);

        return (
          <article
            key={member.id}
            className={`academic-staff-card${selectedId === member.id ? ' academic-staff-card--selected' : ''}${inactive ? ' academic-staff-card--inactive' : ''}`}
          >
            <div className="academic-staff-card__head">
              <div className="academic-staff-card__head-main">
                <Avatar name={member.name} />
                <div className="academic-staff-card__identity">
                  <strong className="academic-staff-card__name">{member.name}</strong>
                  <span className="academic-staff-card__role">{roleLine}</span>
                </div>
              </div>
              <div className="academic-staff-card__badge">{staffStatusBadge(member, t)}</div>
            </div>
            <div className="academic-staff-card__meta">
              <p className="academic-staff-card__email">{member.email ?? t('common.dash')}</p>
              {login ? (
                <p className="academic-staff-card__login tiny muted">
                  <span>{t('admin.account.loginName')}: </span>
                  <span className="academic-staff-card__login-value mono" title={login}>
                    {login}
                  </span>
                </p>
              ) : null}
            </div>
            {onSelect && (
              <StaffCardActions
                member={member}
                canManage={canManage}
                onView={() => onSelect(member.id)}
                onEdit={() => onSelect(member.id)}
                onReactivate={onReactivate ? () => onReactivate(member) : undefined}
                onDeactivate={onDeactivate ? () => onDeactivate(member) : undefined}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}

export { staffShowsDeactivate, staffShowsReactivate } from '@/features/admin/academic-setup/components/staff-reactivate-dialog';
