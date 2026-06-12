'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { accountStatusTone } from '@/lib/account/account-utils';
import type { AccountEntityFields, UserAccountStatus } from '@/types/account';
import { normalizeAccountInfo, resolveAccountStatus } from '@/lib/account/account-utils';

function statusLabelKey(status: UserAccountStatus): string {
  switch (status) {
    case 'active':
      return 'admin.account.accountActive';
    case 'inactive':
      return 'admin.account.accountInactive';
    case 'suspended':
      return 'admin.account.accountSuspended';
    case 'not_created':
      return 'admin.account.noAccount';
    default:
      return 'admin.account.accountUnavailable';
  }
}

export function AccountStatusBadge({
  entity,
  status: statusOverride,
  showLogin = false,
}: {
  entity?: AccountEntityFields;
  status?: UserAccountStatus;
  showLogin?: boolean;
}) {
  const t = useT();
  const status = statusOverride ?? (entity ? resolveAccountStatus(entity) : 'unavailable');
  const account = entity ? normalizeAccountInfo(entity) : null;
  const login = account?.login?.trim();

  return (
    <span className="account-status-badge col" style={{ gap: 4, alignItems: 'flex-start' }}>
      <Badge tone={accountStatusTone(status)}>{t(statusLabelKey(status))}</Badge>
      {showLogin && login ? (
        <span className="tiny muted">
          {t('admin.account.loginName')}: <span className="mono">{login}</span>
        </span>
      ) : null}
    </span>
  );
}
