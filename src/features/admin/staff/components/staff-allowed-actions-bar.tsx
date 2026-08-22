'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { hasStaffAllowedAction } from '@/features/admin/staff/utils/staff-allowed-actions';
import { useT } from '@/features/i18n/locale-context';
import type { StaffAllowedAction, StaffMember } from '@/types/academic-setup';

const ACTION_LABEL_KEYS: Record<StaffAllowedAction, string> = {
  view: 'admin.staffCenter.actions.view',
  view_effective_permissions: 'admin.staffCenter.actions.viewEffectivePermissions',
  edit: 'admin.staffCenter.actions.edit',
  manage_scopes: 'admin.staffCenter.actions.manageScopes',
  manage_permissions: 'admin.staffCenter.actions.managePermissions',
  deactivate: 'admin.staffCenter.actions.deactivate',
  reactivate: 'admin.staffCenter.actions.reactivate',
  link_teacher: 'admin.staffCenter.actions.linkTeacher',
};

const DISABLED_ACTIONS = new Set<StaffAllowedAction>(['link_teacher']);

export function StaffAllowedActionsBar({
  member,
  userId,
  onDeactivate,
  onReactivate,
}: {
  member: StaffMember;
  userId: number;
  onEdit?: () => void;
  onReactivate?: () => void;
  onDeactivate?: () => void;
}) {
  const t = useT();
  const actions = member.allowed_actions;

  function label(action: StaffAllowedAction): string {
    const key = ACTION_LABEL_KEYS[action];
    const msg = t(key);
    return msg !== key ? msg : action;
  }

  function renderAction(action: StaffAllowedAction) {
    if (!hasStaffAllowedAction(actions, action)) return null;
    const disabled = DISABLED_ACTIONS.has(action);

    if (action === 'edit') {
      return (
        <Link
          key={action}
          href={`/admin/staff/${userId}/edit`}
          className="btn btn--ghost btn--sm"
        >
          {label(action)}
        </Link>
      );
    }

    if (action === 'deactivate' && onDeactivate) {
      return (
        <button key={action} type="button" className="btn btn--ghost btn--sm" onClick={onDeactivate}>
          {label(action)}
        </button>
      );
    }

    if (action === 'reactivate' && onReactivate) {
      return (
        <button key={action} type="button" className="btn btn--primary btn--sm" onClick={onReactivate}>
          {label(action)}
        </button>
      );
    }

    if (action === 'manage_scopes' || action === 'manage_permissions') {
      return (
        <Link
          key={action}
          href={`/admin/settings/academic-setup/staff?id=${userId}`}
          className="btn btn--ghost btn--sm"
        >
          {label(action)}
        </Link>
      );
    }

    return (
      <button
        key={action}
        type="button"
        className="btn btn--ghost btn--sm"
        disabled={disabled}
        title={disabled ? t('admin.staffCenter.actions.notAvailableYet') : undefined}
      >
        {label(action)}
      </button>
    );
  }

  const visibleActions = (Object.keys(ACTION_LABEL_KEYS) as StaffAllowedAction[]).map(renderAction).filter(Boolean);
  if (!visibleActions.length) return null;

  return (
    <div className="staff-center-actions row" style={{ gap: 8, flexWrap: 'wrap' }}>
      {visibleActions}
    </div>
  );
}

export function StaffAllowedActionsBadges({ member }: { member: StaffMember }) {
  const t = useT();
  const actions = member.allowed_actions;
  const keys = (Object.keys(ACTION_LABEL_KEYS) as StaffAllowedAction[]).filter((action) =>
    hasStaffAllowedAction(actions, action),
  );
  if (!keys.length) return <span className="muted">{t('common.dash')}</span>;

  return (
    <div className="staff-center-actions-badges">
      {keys.slice(0, 3).map((action) => (
        <Badge key={action} tone="slate">
          {t(ACTION_LABEL_KEYS[action]) !== ACTION_LABEL_KEYS[action]
            ? t(ACTION_LABEL_KEYS[action])
            : action}
        </Badge>
      ))}
      {keys.length > 3 ? <span className="tiny muted">+{keys.length - 3}</span> : null}
    </div>
  );
}
