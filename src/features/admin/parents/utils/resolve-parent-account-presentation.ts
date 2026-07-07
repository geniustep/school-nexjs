import type { Parent } from '@/types/parent';
import {
  resolveGuardianAccountPresentation,
  type GuardianAccountPresentation,
  type GuardianAccountPresentationSource,
} from '@/features/admin/students/utils/resolve-guardian-account-presentation';

export function parentAccountPresentationSource(
  parent: Pick<Parent, 'code' | 'account' | 'has_user_account' | 'login'>,
): GuardianAccountPresentationSource {
  const account = parent.account;
  const mergedAccount =
    account?.login != null || account?.status != null || parent.login
      ? {
          login: account?.login ?? parent.login ?? null,
          status: account?.status ?? null,
          has_user_account: account?.has_user_account ?? parent.has_user_account,
        }
      : account;

  return {
    code: parent.code,
    has_user_account: parent.has_user_account ?? account?.has_user_account,
    account: mergedAccount,
  };
}

export function resolveParentAccountPresentation(
  parent: Pick<Parent, 'code' | 'account' | 'has_user_account' | 'login'>,
): GuardianAccountPresentation {
  return resolveGuardianAccountPresentation(parentAccountPresentationSource(parent));
}
