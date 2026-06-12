/** Unified portal account types — backend smart_school_connect 18.0.1.0.72+ */

export type UserAccountStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'not_created'
  | 'unavailable';

export type AccountWarningCode = 'custom_login_preserved' | 'invite_not_sent' | (string & {});

export interface AccountWarning {
  code: AccountWarningCode;
  message?: string;
}

export interface UserAccountInfo {
  user_id: number;
  status: UserAccountStatus;
  login: string;
  login_synced_with_email?: boolean;
}

export interface AccountMutationResponse {
  action?: 'created' | 'already_exists' | 'updated';
  account?: UserAccountInfo;
  warnings?: AccountWarning[];
}

export interface ActivateAccountPayload {
  email?: string;
  login?: string;
  send_invite?: boolean;
}

/** Entity shapes that may expose account fields from list/detail APIs. */
export interface AccountEntityFields {
  user_id?: number | null;
  login?: string | null;
  email?: string | null;
  account?: UserAccountInfo | null;
  account_status?: string | null;
  status?: string | null;
}
