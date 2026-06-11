'use client';

import { Badge } from '@/components/ui/primitives';
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
    <div className="academic-setup-teacher-grid">
      {members.map((member) => (
        <button
          key={member.id}
          type="button"
          className="academic-setup-teacher-card"
          onClick={onSelect ? () => onSelect(member.id) : undefined}
          style={selectedId === member.id ? { borderColor: 'var(--c-primary)' } : undefined}
        >
          <div className="between">
            <strong>{member.name}</strong>
            <Badge tone={member.account_status === 'active' ? 'green' : 'slate'}>
              {t(`admin.academicSetup.accountStatus.${member.account_status}`)}
            </Badge>
          </div>
          <p className="tiny muted">{member.email ?? t('common.dash')}</p>
          <p className="tiny">
            {t(`admin.academicSetup.adminKind.${member.admin_kind}`)}
            {' · '}
            {member.job_title ?? t('common.dash')}
          </p>
        </button>
      ))}
    </div>
  );
}
