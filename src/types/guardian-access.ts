export const GUARDIAN_LEGAL_STATUSES = ['unknown', 'yes', 'no'] as const;
export type GuardianLegalStatus = (typeof GUARDIAN_LEGAL_STATUSES)[number];

export const GUARDIAN_ACCOUNT_ACCESS_POLICIES = [
  'inherit_legal',
  'allowed',
  'blocked',
] as const;
export type GuardianAccountAccessPolicy = (typeof GUARDIAN_ACCOUNT_ACCESS_POLICIES)[number];

export interface GuardianAccessContractFields {
  legal_status?: GuardianLegalStatus | null;
  account_access_policy?: GuardianAccountAccessPolicy | null;
  account_access_eligible?: boolean | null;
}
