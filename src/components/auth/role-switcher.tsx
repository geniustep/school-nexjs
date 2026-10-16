'use client';

import { useActiveRole } from '@/features/auth/active-role-context';
import { useT } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils/cn';
import { contextKey } from '@/lib/auth/active-context-workspace';

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
  /** Stable test/automation hook — one instance per visible surface. */
  'data-testid': dataTestId = 'role-switcher',
}: {
  className?: string;
  hideLabel?: boolean;
  'data-testid'?: string;
}) {
  const t = useT();
  const {
    activeRole,
    availableRoles,
    activeContext,
    availableContexts,
    contextMode,
    showSwitcher,
    switching,
    error,
    clearError,
    switchRole,
    switchContext,
  } = useActiveRole();

  if (!showSwitcher) return null;

  const activeOption = availableRoles.find(
    (role) => role.code.trim().toLowerCase() === activeRole,
  );
  const activeDisplay = roleLabel(activeRole, activeOption?.label, t);
  const activeContextValue = activeContext ? contextKey(activeContext) : '';

  return (
    <div
      className={cn('role-switcher', hideLabel && 'role-switcher--no-label', className)}
      data-testid={dataTestId}
      data-active-role={activeRole}
    >
      <label className="role-switcher__field">
        {!hideLabel && <span className="role-switcher__label">{t('auth.activeRole')}</span>}
        <select
          className="input input--sm role-switcher__select"
          value={contextMode ? activeContextValue : activeRole}
          disabled={switching}
          aria-label={`${t('auth.activeRole')}: ${activeDisplay}`}
          aria-busy={switching || undefined}
          title={`${t('auth.activeRole')}: ${activeDisplay}`}
          onChange={(e) => {
            clearError();
            const next = e.target.value;
            if (contextMode) {
              const selected = availableContexts.find((ctx) => contextKey(ctx) === next);
              if (selected) {
                void switchContext({ school_id: selected.school_id, role: selected.role });
              }
              return;
            }
            if (next && next !== activeRole) void switchRole(next);
          }}
        >
          {contextMode
            ? availableContexts.map((ctx) => {
                const key = contextKey(ctx);
                const serverRole = availableRoles.find(
                  (role) => role.code.trim().toLowerCase() === ctx.role,
                );
                const roleDisplay = roleLabel(ctx.role, serverRole?.label, t);
                const schoolDisplay = ctx.school_name?.trim() || `#${ctx.school_id}`;
                return (
                  <option key={key} value={key}>
                    {schoolDisplay} — {roleDisplay}
                  </option>
                );
              })
            : availableRoles.map((role) => {
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
