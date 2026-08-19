import { describe, expect, it } from 'vitest';
import {
  buildAccountFilterQuery,
  buildStaffAccountStatusQuery,
} from './account-filter-query';

describe('account list filter query contract', () => {
  it('keeps account existence distinct from lifecycle status', () => {
    expect(buildAccountFilterQuery('has_account')).toEqual({ has_account: 'true' });
    expect(buildAccountFilterQuery('no_account')).toEqual({ has_account: 'false' });
  });

  it('serializes active, inactive, and suspended account status', () => {
    expect(buildAccountFilterQuery('active_account')).toEqual({ account_status: 'active' });
    expect(buildAccountFilterQuery('inactive_account')).toEqual({ account_status: 'inactive' });
    expect(buildAccountFilterQuery('suspended_account')).toEqual({ account_status: 'suspended' });
  });

  it('keeps staff account filtering status-only', () => {
    const query = buildStaffAccountStatusQuery('inactive');
    expect(query).toEqual({ account_status: 'inactive' });
    expect(query).not.toHaveProperty('has_account');
    expect(query).not.toHaveProperty('status');
  });
});
