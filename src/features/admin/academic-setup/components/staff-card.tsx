'use client';

import { Avatar, Badge } from '@/components/ui/primitives';
import { IconMoreHorizontal } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';
import type { StaffMember } from '@/types/academic-setup';

export function StaffCardGrid({
  members,
  selectedId,
  onSelect,
}: {
  members: StaffMember[];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
}) {
  const t = useT();

  return (
    <div className="academic-staff-grid">
      {members.map((member) => (
        <article
          key={member.id}
          className={`academic-staff-card${selectedId === member.id ? ' academic-staff-card--selected' : ''}`}
        >
          <div className="academic-staff-card__head">
            <Avatar name={member.name} />
            <div className="academic-staff-card__identity">
              <strong className="academic-staff-card__name">{member.name}</strong>
              <span className="academic-staff-card__role">
                {member.job_title ?? t(`admin.academicSetup.adminKind.${member.admin_kind}`)}
              </span>
            </div>
            <Badge tone={member.account_status === 'active' ? 'green' : 'slate'}>
              {t(`admin.academicSetup.accountStatus.${member.account_status}`)}
            </Badge>
          </div>
          <p className="academic-staff-card__email">{member.email ?? t('common.dash')}</p>
          <p className="academic-staff-card__kind">
            {t(`admin.academicSetup.adminKind.${member.admin_kind}`)}
          </p>
          <div className="academic-staff-card__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={onSelect ? () => onSelect(member.id) : undefined}
            >
              {t('admin.academicSetup.viewStaffDetails')}
            </button>
            {onSelect && (
              <button
                type="button"
                className="btn btn--ghost btn--sm academic-staff-card__menu"
                aria-label={t('admin.academicSetup.staffActionsMenu')}
                onClick={() => onSelect(member.id)}
              >
                <IconMoreHorizontal size={16} />
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
