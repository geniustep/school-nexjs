import type { ApiResponse } from '@/types/api';
import type { AccountMutationResponse } from '@/types/account';
import {
  extractAccountMutation,
  extractAccountWarnings,
} from '@/lib/account/account-utils';
import { mapAccountWarning } from '@/lib/account/account-errors';

export interface AccountMutationFeedback {
  successMessage: string;
  warningMessages: string[];
  action?: AccountMutationResponse['action'];
  accountLogin?: string;
}

export function resolveAccountMutationFeedback<T>(
  res: ApiResponse<T>,
  t: (key: string, params?: Record<string, string | number>) => string,
  options: {
    createdKey: string;
    updatedKey: string;
    alreadyExistsKey: string;
    inviteSentKey?: string;
  },
): AccountMutationFeedback | null {
  if (!res.success) return null;
  const mutation = extractAccountMutation(res.data);
  const warnings = extractAccountWarnings(res.data).map((w) => mapAccountWarning(w, t));
  const action = mutation?.action;
  const accountLogin = mutation?.account?.login?.trim();

  let successMessage = t(options.updatedKey);
  if (action === 'created') {
    successMessage = accountLogin
      ? t('admin.account.accountCreatedWithLogin', { login: accountLogin })
      : t(options.createdKey);
  } else if (action === 'already_exists') {
    successMessage = accountLogin
      ? t('admin.account.accountAlreadyExistsWithLogin', { login: accountLogin })
      : t(options.alreadyExistsKey);
  }

  return {
    successMessage,
    warningMessages: warnings,
    action,
    accountLogin,
  };
}

export function applyAccountMutationToasts(
  feedback: AccountMutationFeedback,
  toast: { success: (m: string) => void; show: (m: string, tone?: 'info') => void },
): void {
  toast.success(feedback.successMessage);
  for (const warning of feedback.warningMessages) {
    toast.show(warning, 'info');
  }
}
