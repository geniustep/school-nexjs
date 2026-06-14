'use client';

import { useState } from 'react';
import { CreateAccountDialog } from '@/features/admin/account/create-account-dialog';
import { AccountStatusBadge } from '@/features/admin/account/account-status-badge';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeAccountInfo, resolveAccountStatus } from '@/lib/account/account-utils';
import type { AccountEntityFields, AccountMutationResponse } from '@/types/account';
import type { Permission } from '@/types/permissions';

export function EntityAccountPanel({
  entity,
  entityLabel,
  accountEndpoint,
  managePermission,
  defaultEmail = '',
  onAccountChanged,
  compact = false,
}: {
  entity: AccountEntityFields & { id: number };
  entityLabel: string;
  accountEndpoint: string;
  managePermission: Permission;
  defaultEmail?: string;
  onAccountChanged: () => void;
  compact?: boolean;
}) {
  const t = useT();
  const user = useSession();
  const canManage = !!user && hasPermission(user, managePermission);
  const [dialogOpen, setDialogOpen] = useState(false);
  const status = resolveAccountStatus(entity);
  const account = normalizeAccountInfo(entity);
  const hasAccount = status !== 'not_created';

  function handleSuccess(result: AccountMutationResponse) {
    if (result.action === 'already_exists' || result.action === 'created' || result.action === 'updated') {
      onAccountChanged();
    }
  }

  return (
    <div className={compact ? 'entity-account-panel entity-account-panel--compact' : 'entity-account-panel col'} style={{ gap: 12 }}>
      {compact ? (
        <div className="entity-account-panel__compact-body">
          <AccountStatusBadge entity={entity} showLogin={hasAccount} />
          {!hasAccount && canManage ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm entity-account-panel__create-btn"
              onClick={() => setDialogOpen(true)}
            >
              {t('admin.account.createAccount')}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <AccountStatusBadge entity={entity} showLogin={hasAccount} />
          {!hasAccount && canManage ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              style={{ minHeight: 44, alignSelf: 'stretch' }}
              onClick={() => setDialogOpen(true)}
            >
              {t('admin.account.createAccount')}
            </button>
          ) : null}
        </>
      )}
      <CreateAccountDialog
        open={dialogOpen}
        title={t('admin.account.activateAccountTitle', { name: entityLabel })}
        endpoint={accountEndpoint}
        defaultEmail={defaultEmail}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleSuccess}
      />
      {account?.login ? (
        <p className="tiny muted">
          {t('admin.account.currentLogin')}: <span className="mono">{account.login}</span>
        </p>
      ) : null}
    </div>
  );
}
