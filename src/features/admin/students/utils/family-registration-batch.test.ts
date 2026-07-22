import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  addFamilyRegistrationChild,
  emptyFamilyRegistrationFormState,
  FAMILY_REGISTRATION_MAX_CHILDREN,
} from './family-registration-state';
import { FamilyBatchIdempotencyRegistry } from './family-registration-idempotency';
import {
  assertNoForbiddenBatchFields,
  buildBatchGuardiansFromEntries,
  buildFamilyBatchRegistrationRequest,
} from './family-registration-batch-payload';
import { familyBatchErrorMessageKey } from './family-registration-batch-errors';
import { collectFamilyGuardianEntries } from './family-registration-payload';
import { endpoints } from '@/lib/api/endpoints';

function seedTwoChildren() {
  let form = emptyFamilyRegistrationFormState('2026-09-01');
  form.guardianHost = {
    ...form.guardianHost,
    emergencyContactName: 'أحمد العلوي',
    emergencyRelationship: 'father',
    emergencyPhone: '0612345678',
  };
  form.billing = {
    ...form.billing,
    responsibilitySelection: 'guardian',
    guardianSourceMode: 'existing',
    linkedGuardianId: 12,
    billingGuardianEntryKey: 'existing-12',
  };
  form.children[0] = {
    ...form.children[0],
    profile: {
      ...form.children[0].profile,
      firstName: 'يوسف',
      lastName: 'العلوي',
      academicYearId: '1',
      levelId: '2',
      classId: '3',
      actualJoinDate: '2026-09-01',
    },
  };
  form = addFamilyRegistrationChild(form);
  form.children[1] = {
    ...form.children[1],
    profile: {
      ...form.children[1].profile,
      firstName: 'سارة',
      lastName: 'العلوي',
      academicYearId: '1',
      levelId: '2',
      classId: '4',
      actualJoinDate: '2026-09-01',
    },
    relationshipByEntryKey: { 'existing-12': 'father' },
  };
  return form;
}

describe('family-registration-batch-payload', () => {
  it('builds a batch for two children without school_id or family_id', () => {
    const form = seedTwoChildren();
    const idempotency = new FamilyBatchIdempotencyRegistry();
    const request = buildFamilyBatchRegistrationRequest({
      form,
      schoolId: 99,
      idempotency,
    });
    expect(request.children).toHaveLength(2);
    expect(request.guardians).toHaveLength(1);
    expect(request.guardians[0]).toMatchObject({ guardian_id: 12 });
    expect(request.children[0].client_child_id).toBe(form.children[0].localId);
    expect(request.children[0].academic).toMatchObject({
      academic_year_id: 1,
      level_id: 2,
      class_id: 3,
    });
    expect(JSON.stringify(request)).not.toMatch(/"school_id"\s*:/);
    expect(JSON.stringify(request)).not.toMatch(/"family_id"\s*:/);
    expect(() => assertNoForbiddenBatchFields(request)).not.toThrow();
  });

  it('dedups shared guardians and keeps stable client keys', () => {
    const form = seedTwoChildren();
    const entries = collectFamilyGuardianEntries(form);
    const guardians = buildBatchGuardiansFromEntries([...entries, ...entries]);
    expect(guardians).toHaveLength(1);
    expect(guardians[0].client_guardian_key).toBe('existing-12');
  });

  it('keeps child idempotency keys stable across rebuilds', () => {
    const form = seedTwoChildren();
    const idempotency = new FamilyBatchIdempotencyRegistry();
    const first = buildFamilyBatchRegistrationRequest({ form, schoolId: 1, idempotency });
    const second = buildFamilyBatchRegistrationRequest({ form, schoolId: 1, idempotency });
    expect(second.idempotency_key).toBe(first.idempotency_key);
    expect(second.children[0].idempotency_key).toBe(first.children[0].idempotency_key);
    expect(second.children[1].idempotency_key).toBe(first.children[1].idempotency_key);
  });

  it('omits finance when not attached on create', () => {
    const form = seedTwoChildren();
    const request = buildFamilyBatchRegistrationRequest({
      form,
      schoolId: 1,
      idempotency: new FamilyBatchIdempotencyRegistry(),
    });
    expect(request.children.every((child) => child.finance == null)).toBe(true);
  });

  it('enforces max 10 children in state helper', () => {
    let form = seedTwoChildren();
    for (let i = form.children.length; i < FAMILY_REGISTRATION_MAX_CHILDREN; i += 1) {
      form = addFamilyRegistrationChild(form);
    }
    expect(form.children).toHaveLength(10);
    const blocked = addFamilyRegistrationChild(form);
    expect(blocked.children).toHaveLength(10);
  });
});

describe('family batch error mapping', () => {
  it('maps known codes to i18n keys', () => {
    expect(familyBatchErrorMessageKey('duplicate_student')).toContain('duplicate_student');
    expect(familyBatchErrorMessageKey('guardian_tenant_mismatch')).toContain(
      'guardian_tenant_mismatch',
    );
    expect(familyBatchErrorMessageKey('missing_capability')).toContain('missing_capability');
    expect(familyBatchErrorMessageKey('idempotency_conflict')).toContain('idempotency_conflict');
  });
});

describe('batch adoption guards', () => {
  it('exposes batch-registration endpoint and does not keep sequential postStudent fallback', () => {
    expect(endpoints.admin.studentsBatchRegistration).toBe('/admin/students/batch-registration');
    const submitSource = readFileSync(
      join(process.cwd(), 'src/features/admin/students/utils/family-registration-submit.ts'),
      'utf8',
    );
    expect(submitSource).toContain('postBatch');
    expect(submitSource).not.toContain('postStudent');
    expect(submitSource).not.toMatch(/for \(const child of targets\)/);
    expect(submitSource).not.toContain('school.family');
    expect(submitSource).not.toContain('family_id');
    expect(submitSource).not.toMatch(/payment.?collection|family.?collection|receipt/i);

    const pageSource = readFileSync(
      join(process.cwd(), 'src/features/admin/students/components/family-registration-page.tsx'),
      'utf8',
    );
    expect(pageSource).toContain('studentsBatchRegistration');
    expect(pageSource).toContain('submittingRef');
    expect(pageSource).not.toContain('endpoints.admin.students)');
  });

  it('keeps familyRegistration i18n key parity across ar/fr/en/es', async () => {
    const ar = (await import('../../../../../messages/ar.json')).default;
    const en = (await import('../../../../../messages/en.json')).default;
    const fr = (await import('../../../../../messages/fr.json')).default;
    const es = (await import('../../../../../messages/es.json')).default;
    const leafKeys = (value: unknown, prefix = ''): string[] => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];
      return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
        const next = prefix ? `${prefix}.${key}` : key;
        if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
          return leafKeys(nested, next);
        }
        return [next];
      });
    };
    const arKeys = leafKeys(ar.admin.student360.familyRegistration).sort();
    expect(leafKeys(en.admin.student360.familyRegistration).sort()).toEqual(arKeys);
    expect(leafKeys(fr.admin.student360.familyRegistration).sort()).toEqual(arKeys);
    expect(leafKeys(es.admin.student360.familyRegistration).sort()).toEqual(arKeys);
    expect(en.admin.student360.familyRegistration.confirmBatchRegister).toBeTruthy();
    expect(fr.admin.student360.familyRegistration.batchStatus.partially_completed).toBeTruthy();
    expect(es.admin.student360.familyRegistration.batchErrors.missing_capability).toBeTruthy();
  });
});
