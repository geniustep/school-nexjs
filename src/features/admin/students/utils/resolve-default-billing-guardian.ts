import type { GuardianRelationship } from '@/types/student-360';
import { isRelationshipActive } from './relationship-types';

export type DefaultBillingGuardianReason =
  | 'special_billing'
  | 'financial_responsible'
  | 'primary_contact'
  | 'single_guardian'
  | null;

export interface DefaultBillingGuardianResolution {
  guardianId: number | null;
  relationshipId: number | null;
  reason: DefaultBillingGuardianReason;
}

export interface BillingGuardianContext {
  billingProfileGuardianId?: number | null;
  billingPartyType?: string | null;
}

function activeGuardians(relationships: GuardianRelationship[]): GuardianRelationship[] {
  return relationships.filter((r) => isRelationshipActive(r.state, r.active));
}

function isSpecialBillingParty(type: string | null | undefined): boolean {
  if (!type?.trim()) return false;
  const token = type.trim().toLowerCase();
  return token !== 'guardian' && token !== 'parent' && token !== 'student';
}

export function resolveDefaultBillingGuardian(
  relationships: GuardianRelationship[],
  context?: BillingGuardianContext,
): DefaultBillingGuardianResolution {
  const active = activeGuardians(relationships);

  if (isSpecialBillingParty(context?.billingPartyType)) {
    return { guardianId: null, relationshipId: null, reason: 'special_billing' };
  }

  if (context?.billingProfileGuardianId != null) {
    const match = active.find((r) => r.guardian.id === context.billingProfileGuardianId);
    if (match) {
      return {
        guardianId: match.guardian.id,
        relationshipId: match.relationship_id,
        reason: match.is_financial_responsible ? 'financial_responsible' : 'primary_contact',
      };
    }
  }

  const financial = active.filter((r) => r.is_financial_responsible);
  if (financial.length === 1) {
    return {
      guardianId: financial[0].guardian.id,
      relationshipId: financial[0].relationship_id,
      reason: 'financial_responsible',
    };
  }

  const primary = active.filter((r) => r.is_primary_contact);
  if (primary.length === 1) {
    return {
      guardianId: primary[0].guardian.id,
      relationshipId: primary[0].relationship_id,
      reason: 'primary_contact',
    };
  }

  if (active.length === 1) {
    return {
      guardianId: active[0].guardian.id,
      relationshipId: active[0].relationship_id,
      reason: 'single_guardian',
    };
  }

  return { guardianId: null, relationshipId: null, reason: null };
}

export function isDefaultBillingGuardian(
  guardianId: number,
  resolution: DefaultBillingGuardianResolution,
): boolean {
  return resolution.reason != null && resolution.reason !== 'special_billing' && resolution.guardianId === guardianId;
}
