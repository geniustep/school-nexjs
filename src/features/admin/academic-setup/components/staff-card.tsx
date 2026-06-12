'use client';

import { Avatar, Badge } from '@/components/ui/primitives';
import { IconMoreHorizontal } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';
import {
  isStaffInactive,
  resolveStaffLogin,
} from '@/features/admin/academic-setup/utils/staff-utils';
import {
  staffShowsDeactivate,
  staffShowsReactivate,
} from '@/features/admin/academic-setup/components/staff-reactivate-dialog';
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
}: {
  members: StaffMember[];
  selectedId?: number | null;
  canManage?: boolean;
  onSelect?: (id: number) => void;
  onReactivate?: (member: StaffMember) => void;
}) {
  const t = useT();

  return (
    <div className="academic-staff-grid">
      {members.map((member) => {
        const login = resolveStaffLogin(member);
        const inactive = isStaffInactive(member);
        return (
          <article
            key={member.id}
            className={`academic-staff-card${selectedId === member.id ? ' academic-staff-card--selected' : ''}${inactive ? ' academic-staff-card--inactive' : ''}`}
          >
            <div className="academic-staff-card__head">
              <Avatar name={member.name} />
              <div className="academic-staff-card__identity">
                <strong className="academic-staff-card__name">{member.name}</strong>
                <span className="academic-staff-card__role">
                  {member.job_title ?? t(`admin.academicSetup.adminKind.${member.admin_kind}`)}
                </span>
              </div>
              {staffStatusBadge(member, t)}
            </div>
            <p className="academic-staff-card__email">{member.email ?? t('common.dash')}</p>
            {login ? (
              <p className="academic-staff-card__login tiny muted">
                {t('admin.account.loginName')}: <span className="mono">{login}</span>
              </p>
            ) : null}
            <p className="academic-staff-card__kind">
              {t(`admin.academicSetup.adminKind.${member.admin_kind}`)}
            </p>
            <div className="academic-staff-card__actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ minHeight: 44 }}
                onClick={onSelect ? () => onSelect(member.id) : undefined}
              >
                {t('admin.academicSetup.viewStaffDetails')}
              </button>
              {staffShowsReactivate(member, canManage) && onReactivate ? (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  style={{ minHeight: 44 }}
                  onClick={() => onReactivate(member)}
                >
                  {t('admin.academicSetup.reactivateStaff')}
                </button>
              ) : null}
              {onSelect && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm academic-staff-card__menu"
                  style={{ minHeight: 44 }}
                  aria-label={t('admin.academicSetup.staffActionsMenu')}
                  onClick={() => onSelect(member.id)}
                >
                  <IconMoreHorizontal size={16} />
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export { staffShowsDeactivate, staffShowsReactivate };
