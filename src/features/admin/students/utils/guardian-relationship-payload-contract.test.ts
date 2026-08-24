import { describe, expect, it } from 'vitest';
import {
  pickGuardianRelationshipUpdateWriteFields,
  relationshipFormToCreatePayload,
  relationshipFormToUpdatePayload,
} from './guardian-relationship-payload';
import type { RelationshipFormValues } from '../components/guardian-relationship-form';

function values(
  patch: Partial<RelationshipFormValues> = {},
): RelationshipFormValues {
  return {
    relationship_type: 'father',
    legal_status: 'unknown',
    account_access_policy: 'inherit_legal',
    is_legal_guardian: false,
    is_primary_contact: false,
    is_financial_responsible: false,
    receives_notifications: true,
    is_emergency_contact: false,
    is_authorized_pickup: false,
    contact_priority: '',
    date_start: '2026-08-24',
    notes: '',
    ...patch,
  };
}

describe('guardian relationship canonical write payload', () => {
  it('creates new relationships as unknown + inherit_legal without legacy boolean', () => {
    const payload = relationshipFormToCreatePayload(42, values());
    expect(payload.guardian_id).toBe(42);
    expect(payload.legal_status).toBe('unknown');
    expect(payload.account_access_policy).toBe('inherit_legal');
    expect(payload).not.toHaveProperty('is_legal_guardian');
  });

  it('updates using canonical legal status and explicit account policy', () => {
    const payload = relationshipFormToUpdatePayload(
      values({ legal_status: 'yes', account_access_policy: 'allowed', is_legal_guardian: true }),
    );
    expect(payload.legal_status).toBe('yes');
    expect(payload.account_access_policy).toBe('allowed');
    expect(payload).not.toHaveProperty('is_legal_guardian');
  });

  it('validates canonical fields while preserving explicit legacy sanitizer compatibility', () => {
    const payload = pickGuardianRelationshipUpdateWriteFields({
      legal_status: 'no',
      account_access_policy: 'blocked',
      is_legal_guardian: false,
      name: 'must not leak',
    });
    expect(payload).toEqual({
      legal_status: 'no',
      account_access_policy: 'blocked',
      is_legal_guardian: false,
    });

    expect(
      pickGuardianRelationshipUpdateWriteFields({
        legal_status: 'invalid',
        account_access_policy: 'invalid',
      }),
    ).toEqual({});
  });
});
