'use client';

import { useActiveRole } from '@/features/auth/active-role-context';
import { useT } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils/cn';

function roleLabel(code: string, serverLabel: string | undefined, t: (k: string) => string): string {
  const key = `roles.${code}`;
  const translated = t(key);
  if (translated !== key) return translated;
  if (serverLabel && serverLabel.trim()) return serverLabel;
  return code;
}

export function RoleSwitcher({
  className,
  hideLabel = false,
}: {
  className?: string;
  hideLabel?: boolean;
}) {
  const t = useT();
  const { activeRole, availableRoles, showSwitcher, switching, error, clearError, switchRole } =
    useActiveRole();

  if (!showSwitcher) return null;

  return (
    <div className={cn('role-switcher', hideLabel && 'role-switcher--no-label', className)}>
      <label className="role-switcher__field">
        {!hideLabel && <span className="role-switcher__label">{t('auth.activeRole')}</span>}
        <select
          className="input input--sm role-switcher__select"
          value={activeRole}
          disabled={switching}
          aria-label={t('auth.activeRole')}
          aria-busy={switching || undefined}
          onChange={(e) => {
            clearError();
            const next = e.target.value;
            if (next && next !== activeRole) void switchRole(next);
          }}
        >
          {availableRoles.map((role) => {
            const code = role.code.trim().toLowerCase();
            const isActive = code === activeRole;
            return (
              <option key={code} value={code} disabled={isActive && switching}>
                {roleLabel(code, role.label, t)}
                {isActive ? ` — ${t('auth.activeRoleMarker')}` : ''}
              </option>
            );
          })}
        </select>
      </label>
      {switching && (
        <span className="role-switcher__status" role="status">
          {t('auth.switchingRole')}
        </span>
      )}
      {error && (
        <span className="role-switcher__error" role="alert">
          {(() => {
            const key = `auth.roleSwitchErrors.${error}`;
            const labeled = t(key);
            return labeled !== key ? labeled : t('auth.roleSwitchErrors.role_switch_failed');
          })()}
        </span>
      )}
    </div>
  );
}
