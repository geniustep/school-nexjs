import { describe, expect, it } from 'vitest';
import {
  guardianAccessCopy,
  isGuardianAccountAccessPolicy,
  isGuardianLegalStatus,
  resolveGuardianAccessOutcome,
  resolveGuardianAccountAccessPolicy,
  resolveGuardianLegalStatus,
} from './guardian-access-contract';

describe('guardian access contract', () => {
  it('prefers canonical legal status and treats legacy false as unknown', () => {
    expect(resolveGuardianLegalStatus({ legal_status: 'no', is_legal_guardian: true })).toBe('no');
    expect(resolveGuardianLegalStatus({ is_legal_guardian: true })).toBe('yes');
    expect(resolveGuardianLegalStatus({ is_legal_guardian: false })).toBe('unknown');
    expect(resolveGuardianLegalStatus({})).toBe('unknown');
  });

  it('defaults account access to inherit_legal and validates values', () => {
    expect(resolveGuardianAccountAccessPolicy({})).toBe('inherit_legal');
    expect(resolveGuardianAccountAccessPolicy({ account_access_policy: 'allowed' })).toBe('allowed');
    expect(resolveGuardianAccountAccessPolicy({ account_access_policy: 'other' })).toBe('inherit_legal');
    expect(isGuardianLegalStatus('unknown')).toBe(true);
    expect(isGuardianLegalStatus('false')).toBe(false);
    expect(isGuardianAccountAccessPolicy('blocked')).toBe(true);
    expect(isGuardianAccountAccessPolicy('deny')).toBe(false);
  });

  it('implements the product decision matrix', () => {
    expect(resolveGuardianAccessOutcome('unknown', 'inherit_legal')).toBe('pending_legal');
    expect(resolveGuardianAccessOutcome('yes', 'inherit_legal')).toBe('allowed_legal');
    expect(resolveGuardianAccessOutcome('no', 'inherit_legal')).toBe('denied_not_legal');
    expect(resolveGuardianAccessOutcome('unknown', 'allowed')).toBe('allowed_explicit');
    expect(resolveGuardianAccessOutcome('no', 'allowed')).toBe('allowed_explicit');
    expect(resolveGuardianAccessOutcome('yes', 'blocked')).toBe('blocked');
  });

  it('ships concise Arabic UX copy for the new controls', () => {
    const copy = guardianAccessCopy('ar');
    expect(copy.legalUnknown).toBe('غير محددة');
    expect(copy.accessAllowed).toBe('مسموح');
    expect(copy.outcomePendingLegal).toContain('معلّق');
  });
});
