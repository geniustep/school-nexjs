import { describe, expect, it } from 'vitest';
import { resolveDefaultBillingGuardian } from './resolve-default-billing-guardian';
import type { GuardianRelationship } from '@/types/student-360';

function rel(partial: Partial<GuardianRelationship> & Pick<GuardianRelationship, 'relationship_id' | 'guardian'>): GuardianRelationship {
  return {
    relationship_type: 'father',
    is_primary_contact: false,
    is_legal_guardian: false,
    is_financial_responsible: false,
    receives_notifications: false,
    is_emergency_contact: false,
    is_authorized_pickup: false,
    state: 'active',
    active: true,
    ...partial,
  };
}

describe('resolveDefaultBillingGuardian', () => {
  it('prefers financial responsible guardian', () => {
    const resolution = resolveDefaultBillingGuardian([
      rel({ relationship_id: 1, guardian: { id: 10, name: 'A' }, is_primary_contact: true }),
      rel({ relationship_id: 2, guardian: { id: 20, name: 'B' }, is_financial_responsible: true }),
    ]);
    expect(resolution.guardianId).toBe(20);
    expect(resolution.reason).toBe('financial_responsible');
  });

  it('uses single guardian when only one active', () => {
    const resolution = resolveDefaultBillingGuardian([
      rel({ relationship_id: 1, guardian: { id: 10, name: 'A' } }),
    ]);
    expect(resolution.guardianId).toBe(10);
    expect(resolution.reason).toBe('single_guardian');
  });
});
