import type { ParentAccountInfo, ParentAllowedActions } from '@/types/parent';
import type { GuardianAccountInfo } from '@/types/student-360';

export type GuardianAccountPasswordSource =
  | ParentAccountInfo
  | GuardianAccountInfo
  | null
  | undefined;

export interface GuardianAccountPasswordFields {
  can_assign_password?: boolean;
  password_was_set: boolean;
  has_user_account?: boolean;
  login?: string | null;
  status?: string | null;
}

export type GuardianPasswordActionMode = 'set' | 'reset';

export interface GuardianPasswordActionContract {
  visible: boolean;
  mode: GuardianPasswordActionMode;
  labelKey: string;
  titleKey: string;
  submitKey: string;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/** Safe normalization for legacy/missing guardian account password fields. */
export function normalizeGuardianAccountPasswordFields(
  source: GuardianAccountPasswordSource,
): GuardianAccountPasswordFields {
  return {
    can_assign_password: readBoolean(source?.can_assign_password),
    password_was_set: source?.password_was_set === true,
    has_user_account: readBoolean(source?.has_user_account),
    login: source?.login ?? null,
    status: source?.status ?? null,
  };
}

function hasActiveGuardianLoginAccount(
  source: GuardianAccountPasswordSource,
  fields: GuardianAccountPasswordFields,
): boolean {
  if (fields.has_user_account === true) return true;
  return !!fields.login && fields.status === 'active';
}

/** Actor + account gate; tolerates parent-detail GET false-negative on school. */
export function resolveEffectiveCanAssignPassword(
  source: GuardianAccountPasswordSource,
  options?: { allowed_parent_actions?: ParentAllowedActions | null },
): boolean {
  if (!canAssignGuardianPasswordFromOptions(options?.allowed_parent_actions)) return false;
  const fields = normalizeGuardianAccountPasswordFields(source);
  if (fields.can_assign_password === true) return true;
  if (fields.can_assign_password === false && hasActiveGuardianLoginAccount(source, fields)) {
    return true;
  }
  return false;
}

export function canAssignGuardianPasswordFromOptions(
  allowed?: ParentAllowedActions | null,
): boolean {
  return allowed?.account_assign_password !== false;
}

export function resolveGuardianPasswordAction(
  source: GuardianAccountPasswordSource,
  options?: { allowed_parent_actions?: ParentAllowedActions | null },
): GuardianPasswordActionContract {
  const fields = normalizeGuardianAccountPasswordFields(source);
  const permissionAllowed = resolveEffectiveCanAssignPassword(source, options);

  const mode: GuardianPasswordActionMode = fields.password_was_set ? 'reset' : 'set';

  return {
    visible: permissionAllowed,
    mode,
    labelKey:
      mode === 'reset'
        ? 'admin.guardianAccount.password.resetAction'
        : 'admin.guardianAccount.password.setAction',
    titleKey:
      mode === 'reset'
        ? 'admin.guardianAccount.password.resetTitle'
        : 'admin.guardianAccount.password.setTitle',
    submitKey:
      mode === 'reset'
        ? 'admin.guardianAccount.password.resetSubmit'
        : 'admin.guardianAccount.password.setSubmit',
  };
}

/** Local account patch after successful password assign — login unchanged, password_was_set=true. */
export function applyGuardianPasswordAssignSuccess<T extends GuardianAccountPasswordSource>(
  account: T,
): T {
  if (!account || typeof account !== 'object') {
    return account;
  }
  return {
    ...account,
    password_was_set: true,
  };
}

export function resolveGuardianPasswordParentId(input: {
  guardianId?: number | null;
  partnerId?: number | null;
  relationshipId?: number | null;
}): number | null {
  if (typeof input.guardianId === 'number' && input.guardianId > 0) {
    return input.guardianId;
  }
  return null;
}
