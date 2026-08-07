import { describe, expect, it } from 'vitest';
import {
  assertCanonicalRecipientPayload,
  buildGroupRecipientScope,
  buildIndividualRecipientScope,
  buildRecipientScopePayload,
  isBeneficiaryAllowedForScopeLevel,
  recipientComposeFingerprint,
} from './recipient-scope';

describe('recipient-scope mapping', () => {
  it('maps school/everyone and school/guardians', () => {
    expect(
      buildGroupRecipientScope({
        level: 'school',
        beneficiaryKind: 'everyone',
        entityId: null,
      }),
    ).toEqual({ scope_type: 'school', beneficiary_kind: 'everyone' });
    expect(
      buildGroupRecipientScope({
        level: 'school',
        beneficiaryKind: 'guardians',
        entityId: null,
      }),
    ).toEqual({ scope_type: 'school', beneficiary_kind: 'guardians' });
  });

  it('maps class/students_and_guardians, level/teachers, cycle/guardians', () => {
    expect(
      buildGroupRecipientScope({
        level: 'class',
        beneficiaryKind: 'students_and_guardians',
        entityId: 12,
      }),
    ).toEqual({
      scope_type: 'class',
      beneficiary_kind: 'students_and_guardians',
      scope_id: 12,
    });
    expect(
      buildGroupRecipientScope({
        level: 'level',
        beneficiaryKind: 'teachers',
        entityId: 4,
      }),
    ).toEqual({ scope_type: 'level', beneficiary_kind: 'teachers', scope_id: 4 });
    expect(
      buildGroupRecipientScope({
        level: 'cycle',
        beneficiaryKind: 'guardians',
        entityId: 2,
      }),
    ).toEqual({ scope_type: 'cycle', beneficiary_kind: 'guardians', scope_id: 2 });
  });

  it('maps individual teacher/student/guardian with domain ids', () => {
    expect(buildIndividualRecipientScope('teacher', 9)).toEqual({
      scope_type: 'individual',
      recipient_type: 'teacher',
      recipient_id: 9,
    });
    expect(buildIndividualRecipientScope('student', 15)).toEqual({
      scope_type: 'individual',
      recipient_type: 'student',
      recipient_id: 15,
    });
    expect(buildIndividualRecipientScope('guardian', 21)).toEqual({
      scope_type: 'individual',
      recipient_type: 'guardian',
      recipient_id: 21,
    });
  });

  it('rejects invalid combinations for class/level/cycle', () => {
    expect(isBeneficiaryAllowedForScopeLevel('class', 'everyone')).toBe(false);
    expect(isBeneficiaryAllowedForScopeLevel('level', 'staff')).toBe(false);
    expect(isBeneficiaryAllowedForScopeLevel('cycle', 'everyone')).toBe(false);
    expect(
      buildGroupRecipientScope({
        level: 'class',
        beneficiaryKind: 'everyone',
        entityId: 1,
      }),
    ).toBeNull();
    expect(
      buildGroupRecipientScope({
        level: 'level',
        beneficiaryKind: 'staff',
        entityId: 1,
      }),
    ).toBeNull();
  });

  it('requires entity id for non-school scopes', () => {
    expect(
      buildGroupRecipientScope({
        level: 'class',
        beneficiaryKind: 'students',
        entityId: null,
      }),
    ).toBeNull();
  });

  it('builds canonical payload without school_id or recipient_ids', () => {
    const payload = buildRecipientScopePayload({
      scope_type: 'school',
      beneficiary_kind: 'staff',
    });
    expect(assertCanonicalRecipientPayload(payload as Record<string, unknown>)).toEqual({
      ok: true,
    });
    expect(assertCanonicalRecipientPayload({ ...payload, school_id: 3 })).toEqual({
      ok: false,
      reason: 'school_id',
    });
    expect(assertCanonicalRecipientPayload({ ...payload, recipient_ids: [1] })).toEqual({
      ok: false,
      reason: 'recipient_ids',
    });
  });

  it('invalidates fingerprint when scope or message changes', () => {
    const scope = buildGroupRecipientScope({
      level: 'school',
      beneficiaryKind: 'guardians',
      entityId: null,
    });
    const a = recipientComposeFingerprint({
      scope,
      subject: 'Hi',
      body: 'Body',
    });
    const b = recipientComposeFingerprint({
      scope,
      subject: 'Hi',
      body: 'Body changed',
    });
    const c = recipientComposeFingerprint({
      scope: buildGroupRecipientScope({
        level: 'school',
        beneficiaryKind: 'staff',
        entityId: null,
      }),
      subject: 'Hi',
      body: 'Body',
    });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});
