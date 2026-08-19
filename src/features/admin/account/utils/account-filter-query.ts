export type AccountStatusValue = '' | 'active' | 'inactive' | 'suspended';

export type AccountFilterQuery = {
  has_account?: 'true' | 'false';
  account_status?: Exclude<AccountStatusValue, ''>;
};

/**
 * Map admin account-filter UI values to the canonical Odoo list query contract.
 * Existence (has/no account) and lifecycle status are intentionally distinct.
 */
export function buildAccountFilterQuery(filter: string): AccountFilterQuery {
  if (filter === 'has_account') return { has_account: 'true' };
  if (filter === 'no_account') return { has_account: 'false' };
  if (filter === 'active_account') return { account_status: 'active' };
  if (filter === 'inactive_account') return { account_status: 'inactive' };
  if (filter === 'suspended_account') return { account_status: 'suspended' };
  return {};
}

/** Staff list has no no-account semantics; it only filters existing accounts by status. */
export function buildStaffAccountStatusQuery(status: AccountStatusValue): AccountFilterQuery {
  return status ? { account_status: status } : {};
}
