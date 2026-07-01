import { describe, expect, it } from 'vitest';
import { isGuardianRelationshipConfirmRequiredError } from './guardian-api-errors';
import { buildDetachRelationshipPayload } from './guardian-remove-relationship';
import {
  canDetachGuardianRelationship,
  canSubmitRemoval,
  isRemovalBlocked,
  normalizeRemovalImpactFromRaw,
} from './guardian-removal-shared';
import { canRemoveGuardianRelationship } from './normalize-guardian-relationship';
import type { GuardianRelationship } from '@/types/student-360';

describe('guardian-removal-shared', () => {
  it('allows detach only when remove_relationship is true', () => {
    expect(canDetachGuardianRelationship({ remove_relationship: true })).toBe(true);
    expect(canDetachGuardianRelationship({ remove_relationship: false })).toBe(false);
    expect(canDetachGuardianRelationship(undefined)).toBe(false);
    expect(canDetachGuardianRelationship({ remove_relationship: true }, false)).toBe(false);
  });

  it('treats financial_blockers as warnings, not hard blocks', () => {
    const impact = normalizeRemovalImpactFromRaw({
      financial_blockers: [
        {
          code: 'active_finance_profile',
          message: 'Active finance profile references this guardian.',
        },
      ],
      requires_confirmation: true,
    });

    expect(impact?.blocked).not.toBe(true);
    expect(isRemovalBlocked(impact, { remove_relationship: true })).toBe(false);
    expect(canSubmitRemoval(impact, { remove_relationship: true })).toBe(true);
  });

  it('blocks submit when backend marks removal blocked', () => {
    const impact = normalizeRemovalImpactFromRaw({ blocked: true });
    expect(canSubmitRemoval(impact, { remove_relationship: true })).toBe(false);
  });
});

describe('buildDetachRelationshipPayload', () => {
  it('sends confirm flag and reason field', () => {
    expect(buildDetachRelationshipPayload(true, '  test reason  ')).toEqual({
      confirm: true,
      reason: 'test reason',
    });
    expect(buildDetachRelationshipPayload(false)).toEqual({ confirm: false, reason: undefined });
  });
});

describe('isGuardianRelationshipConfirmRequiredError', () => {
  it('detects 409 financial dependency code', () => {
    expect(
      isGuardianRelationshipConfirmRequiredError({
        code: 'guardian_relationship_has_financial_dependencies',
        message: 'needs confirm',
      }),
    ).toBe(true);
    expect(
      isGuardianRelationshipConfirmRequiredError({
        code: 'guardian_relationship_has_financial_dependencies',
        message: 'needs confirm',
        details: { status: 409 },
      }),
    ).toBe(true);
    expect(isGuardianRelationshipConfirmRequiredError({ code: 'server_error', message: 'x' })).toBe(false);
  });
});

describe('canRemoveGuardianRelationship', () => {
  const baseRel = {
    relationship_id: 1,
    guardian: { id: 2, name: 'Parent' },
    relationship_type: 'father',
    is_primary_contact: false,
    is_legal_guardian: false,
    is_financial_responsible: false,
    receives_notifications: true,
    is_emergency_contact: false,
    is_authorized_pickup: false,
    state: 'active',
    active: true,
  } satisfies GuardianRelationship;

  it('requires remove_relationship=true on relationship', () => {
    expect(
      canRemoveGuardianRelationship(
        { ...baseRel, allowed_actions: { remove_relationship: true } },
        true,
      ),
    ).toBe(true);
    expect(
      canRemoveGuardianRelationship(
        { ...baseRel, allowed_actions: { remove_relationship: false } },
        true,
      ),
    ).toBe(false);
  });
});
