import type {
  ClassRecipientScope,
  CycleRecipientScope,
  GroupScopeLevel,
  IndividualRecipientScope,
  IndividualRecipientType,
  LevelRecipientScope,
  RecipientScope,
  SchoolBeneficiaryKind,
  SchoolRecipientScope,
  SectionBeneficiaryKind,
} from '@/types/recipient-scope';
import {
  SCHOOL_BENEFICIARY_KINDS,
  SECTION_BENEFICIARY_KINDS,
} from '@/types/recipient-scope';

export function schoolBeneficiaryKinds(): readonly SchoolBeneficiaryKind[] {
  return SCHOOL_BENEFICIARY_KINDS;
}

export function sectionBeneficiaryKinds(): readonly SectionBeneficiaryKind[] {
  return SECTION_BENEFICIARY_KINDS;
}

export function isSchoolBeneficiaryKind(value: string): value is SchoolBeneficiaryKind {
  return (SCHOOL_BENEFICIARY_KINDS as readonly string[]).includes(value);
}

export function isSectionBeneficiaryKind(value: string): value is SectionBeneficiaryKind {
  return (SECTION_BENEFICIARY_KINDS as readonly string[]).includes(value);
}

/** UI must not offer school-only kinds on class/level/cycle. */
export function isBeneficiaryAllowedForScopeLevel(
  level: GroupScopeLevel,
  kind: string,
): boolean {
  if (level === 'school') return isSchoolBeneficiaryKind(kind);
  return isSectionBeneficiaryKind(kind);
}

export function buildSchoolRecipientScope(
  beneficiary_kind: SchoolBeneficiaryKind,
): SchoolRecipientScope {
  return { scope_type: 'school', beneficiary_kind };
}

export function buildClassRecipientScope(
  beneficiary_kind: SectionBeneficiaryKind,
  scope_id: number,
): ClassRecipientScope {
  return { scope_type: 'class', beneficiary_kind, scope_id };
}

export function buildLevelRecipientScope(
  beneficiary_kind: SectionBeneficiaryKind,
  scope_id: number,
): LevelRecipientScope {
  return { scope_type: 'level', beneficiary_kind, scope_id };
}

export function buildCycleRecipientScope(
  beneficiary_kind: SectionBeneficiaryKind,
  scope_id: number,
): CycleRecipientScope {
  return { scope_type: 'cycle', beneficiary_kind, scope_id };
}

export function buildIndividualRecipientScope(
  recipient_type: IndividualRecipientType,
  recipient_id: number,
): IndividualRecipientScope {
  return { scope_type: 'individual', recipient_type, recipient_id };
}

export function isPositiveDomainId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/**
 * Build canonical group scope from UI state.
 * Returns null when selection is incomplete or invalid.
 */
export function buildGroupRecipientScope(input: {
  level: GroupScopeLevel | null;
  beneficiaryKind: string | null;
  entityId: number | null;
}): RecipientScope | null {
  const { level, beneficiaryKind, entityId } = input;
  if (!level || !beneficiaryKind) return null;
  if (!isBeneficiaryAllowedForScopeLevel(level, beneficiaryKind)) return null;

  if (level === 'school') {
    return buildSchoolRecipientScope(beneficiaryKind as SchoolBeneficiaryKind);
  }
  if (!isPositiveDomainId(entityId)) return null;
  if (level === 'class') {
    return buildClassRecipientScope(beneficiaryKind as SectionBeneficiaryKind, entityId);
  }
  if (level === 'level') {
    return buildLevelRecipientScope(beneficiaryKind as SectionBeneficiaryKind, entityId);
  }
  return buildCycleRecipientScope(beneficiaryKind as SectionBeneficiaryKind, entityId);
}

export function buildRecipientScopePayload(scope: RecipientScope): {
  recipient_scope: RecipientScope;
} {
  return { recipient_scope: scope };
}

/** Stable fingerprint for stale-preview detection (scope + subject + body). */
export function recipientComposeFingerprint(input: {
  scope: RecipientScope | null;
  subject: string;
  body: string;
}): string | null {
  if (!input.scope) return null;
  return JSON.stringify({
    scope: input.scope,
    subject: input.subject.trim(),
    body: input.body.trim(),
  });
}

/** Assert payload never carries forbidden client fields (tests / guards). */
export function assertCanonicalRecipientPayload(
  payload: Record<string, unknown>,
): { ok: true } | { ok: false; reason: string } {
  if ('school_id' in payload) return { ok: false, reason: 'school_id' };
  if ('recipient_ids' in payload) return { ok: false, reason: 'recipient_ids' };
  if ('recipient_summary' in payload) return { ok: false, reason: 'recipient_summary' };
  if ('counts' in payload) return { ok: false, reason: 'counts' };

  const scope = payload.recipient_scope;
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) {
    return { ok: false, reason: 'recipient_scope' };
  }
  const row = scope as Record<string, unknown>;
  if ('school_id' in row) return { ok: false, reason: 'scope.school_id' };
  if ('recipient_ids' in row) return { ok: false, reason: 'scope.recipient_ids' };
  if (row.scope_type === 'individual') {
    // Domain entity id only — never res.users id as a separate field.
    if ('user_id' in row || 'res_users_id' in row) {
      return { ok: false, reason: 'user_id' };
    }
  }
  return { ok: true };
}
