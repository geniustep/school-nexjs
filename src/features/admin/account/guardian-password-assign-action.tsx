'use client';

import { useMemo, useState } from 'react';
import { GuardianPasswordAssignDialog } from '@/features/admin/account/guardian-password-assign-dialog';
import { useParentOptions } from '@/features/admin/parents/hooks/use-parent-options';
import {
  applyGuardianPasswordAssignSuccess,
  resolveGuardianPasswordAction,
  resolveGuardianPasswordParentId,
} from '@/features/admin/parents/utils/guardian-password-contract';
import type { GuardianAccountPasswordSource } from '@/features/admin/parents/utils/guardian-password-contract';
import { useT } from '@/features/i18n/locale-context';

export function GuardianPasswordAssignAction({
  guardianId,
  guardianName,
  account,
  onAccountUpdated,
  buttonClassName = 'btn btn--secondary btn--sm',
}: {
  guardianId: number | null;
  guardianName?: string;
  account: GuardianAccountPasswordSource;
  onAccountUpdated?: (account: NonNullable<GuardianAccountPasswordSource>) => void;
  buttonClassName?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [accountOverride, setAccountOverride] = useState<GuardianAccountPasswordSource>(null);
  const parentId = resolveGuardianPasswordParentId({ guardianId });
  const optionsState = useParentOptions(
    open ||
      account?.can_assign_password === true ||
      account?.has_user_account === true,
  );

  const mergedAccount = useMemo(
    () => (accountOverride ? { ...account, ...accountOverride } : account),
    [account, accountOverride],
  );

  const action = resolveGuardianPasswordAction(mergedAccount, {
    allowed_parent_actions: optionsState.options?.allowed_parent_actions,
  });

  if (!action.visible || parentId == null) return null;

  return (
    <>
      <button type="button" className={buttonClassName} onClick={() => setOpen(true)}>
        {t(action.labelKey)}
      </button>
      <GuardianPasswordAssignDialog
        open={open}
        guardianId={parentId}
        guardianName={guardianName}
        mode={action.mode}
        policy={optionsState.options?.password_policy}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          const nextAccount = applyGuardianPasswordAssignSuccess(mergedAccount);
          if (nextAccount) {
            setAccountOverride(nextAccount);
            onAccountUpdated?.(nextAccount);
          }
        }}
      />
    </>
  );
}
