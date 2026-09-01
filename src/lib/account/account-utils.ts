import type {
  AccountEntityFields,
  AccountMutationResponse,
  AccountWarning,
  UserAccountInfo,
  UserAccountStatus,
} from '@/types/account';

export interface AccountIdentityInput {
  email: string;
  login: string;
  originalEmail?: string;
  originalLogin?: string;
  useDifferentLogin: boolean;
  isCreate: boolean;
}

export interface AccountIdentityPayload {
  email?: string;
  login?: string;
}

/** Build email/login payload — dirty on update; never mirrors email into login locally. */
export function buildAccountIdentityPayload(input: AccountIdentityInput): AccountIdentityPayload {
  const email = input.email.trim();
  const login = input.login.trim();

  if (input.isCreate) {
    const out: AccountIdentityPayload = {};
    if (email) out.email = email;
    if (input.useDifferentLogin && login) out.login = login;
    return out;
  }

  const out: AccountIdentityPayload = {};
  const origEmail = (input.originalEmail ?? '').trim();
  const origLogin = (input.originalLogin ?? '').trim();

  if (email !== origEmail) {
    out.email = email || undefined;
  }
  if (login !== origLogin) {
    out.login = login || undefined;
  }
  return out;
}

export function buildActivateAccountPayload(input: {
  email: string;
  login: string;
  password: string;
  passwordConfirmation?: string;
  sendInvite?: boolean;
  mustChangePassword?: boolean;
}): {
  email?: string;
  login?: string;
  password?: string;
  password_confirmation?: string;
  send_invite: boolean;
  must_change_password?: boolean;
} {
  const email = input.email.trim();
  const login = input.login.trim();
  const password = input.password;
  const passwordConfirmation = input.passwordConfirmation;
  const payload: {
    email?: string;
    login?: string;
    password?: string;
    password_confirmation?: string;
    send_invite: boolean;
    must_change_password?: boolean;
  } = {
    send_invite: input.sendInvite ?? false,
  };
  if (email) payload.email = email;
  if (login) payload.login = login;
  if (password) {
    payload.password = password;
    if (passwordConfirmation) payload.password_confirmation = passwordConfirmation;
  }
  if (input.mustChangePassword) payload.must_change_password = true;
  return payload;
}

export function validateActivateAccountInput(email: string, login: string): boolean {
  return Boolean(email.trim() || login.trim());
}

export function validateCreateAccountInput(
  email: string,
  login: string,
  useDifferentLogin: boolean,
): boolean {
  if (useDifferentLogin) return Boolean(login.trim() || email.trim());
  return Boolean(email.trim() || login.trim());
}

function mapLegacyStatus(raw: string | null | undefined): UserAccountStatus {
  const s = (raw ?? '').toLowerCase();
  if (s === 'active') return 'active';
  if (s === 'inactive' || s === 'archived') return 'inactive';
  if (s === 'suspended') return 'suspended';
  if (s === 'no_school' || s === 'unavailable') return 'unavailable';
  if (s === 'not_created' || s === 'no_account') return 'not_created';
  return 'unavailable';
}

/** Normalize account info from entity payloads without inventing login values. */
export function normalizeAccountInfo(entity: AccountEntityFields): UserAccountInfo | null {
  if (entity.account?.user_id) {
    return entity.account;
  }
  if (entity.user_id) {
    const login = entity.login?.trim() || entity.email?.trim() || '';
    return {
      user_id: entity.user_id,
      status: mapLegacyStatus(entity.account_status ?? entity.status),
      login,
      login_synced_with_email:
        Boolean(entity.email?.trim()) &&
        Boolean(login) &&
        entity.email!.trim() === login,
    };
  }
  return null;
}

export function resolveAccountStatus(entity: AccountEntityFields): UserAccountStatus {
  const account = normalizeAccountInfo(entity);
  if (account) return account.status;
  return 'not_created';
}

export function extractAccountWarnings(data: unknown): AccountWarning[] {
  if (!data || typeof data !== 'object') return [];
  const record = data as AccountMutationResponse;
  return Array.isArray(record.warnings) ? record.warnings : [];
}

export function extractAccountMutation(data: unknown): AccountMutationResponse | null {
  if (!data || typeof data !== 'object') return null;
  return data as AccountMutationResponse;
}

export function accountStatusTone(
  status: UserAccountStatus,
): 'green' | 'slate' | 'amber' | 'red' {
  switch (status) {
    case 'active':
      return 'green';
    case 'suspended':
      return 'red';
    case 'inactive':
      return 'amber';
    default:
      return 'slate';
  }
}
