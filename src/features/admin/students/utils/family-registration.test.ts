import { describe, expect, it } from 'vitest';
import {
  addFamilyRegistrationChild,
  emptyFamilyRegistrationFormState,
  removeFamilyRegistrationChild,
  updateFamilyRegistrationChild,
} from './family-registration-state';
import {
  buildFamilyChildCreatePayload,
  collectFamilyGuardianEntries,
  summarizeFamilyRegistration,
  validateFamilyRegistrationGuardiansStep,
} from './family-registration-payload';
import {
  extractResolvedGuardiansFromStudentPayload,
  resolveFamilyGuardianEntriesToExisting,
} from './family-registration-resolve-guardians';
import {
  familySubmitOutcomeSummary,
  runFamilyRegistrationSubmit,
  shouldOfferFamilyFailedRetry,
} from './family-registration-submit';
import type { StudentCreateGuardianEntry } from '@/types/student-enrollment-finance';

const t = (key: string) => key;

function seedFamilyWithOneGuardianAndChild() {
  const form = emptyFamilyRegistrationFormState('2026-07-22');
  form.guardianHost = {
    ...form.guardianHost,
    emergencyContactName: 'أحمد العلوي',
    emergencyRelationship: 'father',
    emergencyPhone: '0612345678',
    guardianEmail: 'ahmed@example.com',
  };
  form.billing = {
    ...form.billing,
    responsibilitySelection: 'guardian',
    guardianSourceMode: 'new',
    billingGuardianEntryKey: null,
  };
  form.children[0] = {
    ...form.children[0],
    profile: {
      ...form.children[0].profile,
      firstName: 'يوسف',
      lastName: 'العلوي',
      cycleId: '1',
      academicYearId: '10',
      levelId: '3',
    },
  };
  return form;
}

describe('family registration state', () => {
  it('adds and removes children while preserving guardian host', () => {
    let form = seedFamilyWithOneGuardianAndChild();
    form = addFamilyRegistrationChild(form);
    expect(form.children).toHaveLength(2);
    expect(form.guardianHost.emergencyContactName).toBe('أحمد العلوي');
    form = removeFamilyRegistrationChild(form, form.children[1].localId);
    expect(form.children).toHaveLength(1);
  });

  it('preserves sibling profiles when updating another child', () => {
    let form = seedFamilyWithOneGuardianAndChild();
    form = addFamilyRegistrationChild(form);
    const firstId = form.children[0].localId;
    const secondId = form.children[1].localId;
    form = updateFamilyRegistrationChild(form, secondId, {
      profile: {
        ...form.children[1].profile,
        firstName: 'مريم',
        lastName: 'العلوي',
        cycleId: '1',
        academicYearId: '10',
        levelId: '4',
      },
    });
    expect(form.children.find((c) => c.localId === firstId)?.profile.firstName).toBe('يوسف');
    expect(form.children.find((c) => c.localId === secondId)?.profile.firstName).toBe('مريم');
  });
});

describe('family guardian reuse and payload', () => {
  it('builds atomic guardian_relationships for a new guardian', () => {
    const form = seedFamilyWithOneGuardianAndChild();
    const entries = collectFamilyGuardianEntries(form);
    const payload = buildFamilyChildCreatePayload({
      child: form.children[0],
      guardianHost: form.guardianHost,
      billing: form.billing,
      guardianEntries: entries,
      schoolId: 1,
    });
    expect(payload.guardian_relationships).toEqual([
      expect.objectContaining({
        guardian: expect.objectContaining({
          full_name: 'أحمد العلوي',
          phone: '0612345678',
        }),
        relationship_type: 'father',
        is_financial_responsible: true,
      }),
    ]);
    expect(payload.billing_responsibility).toEqual({ mode: 'guardian' });
    expect(payload.finance).toBeUndefined();
  });

  it('reuses existing guardian_id without nesting a new guardian object', () => {
    const form = seedFamilyWithOneGuardianAndChild();
    form.billing.guardianSourceMode = 'existing';
    form.billing.linkedGuardianId = 699;
    form.guardianHost.emergencyContactName = 'فاطمة العلوي';
    const entries = collectFamilyGuardianEntries(form);
    const payload = buildFamilyChildCreatePayload({
      child: form.children[0],
      guardianHost: form.guardianHost,
      billing: form.billing,
      guardianEntries: entries,
      schoolId: 1,
    });
    expect(payload.guardian_relationships?.[0]).toMatchObject({
      guardian_id: 699,
      is_financial_responsible: true,
    });
    expect(
      (payload.guardian_relationships?.[0] as { guardian?: unknown }).guardian,
    ).toBeUndefined();
  });

  it('applies per-child relationship overrides', () => {
    const form = seedFamilyWithOneGuardianAndChild();
    form.billing.guardianSourceMode = 'existing';
    form.billing.linkedGuardianId = 42;
    const entries = collectFamilyGuardianEntries(form);
    form.children[0] = {
      ...form.children[0],
      relationshipByEntryKey: {
        [entries[0].entryKey]: 'mother',
      },
    };
    const payload = buildFamilyChildCreatePayload({
      child: form.children[0],
      guardianHost: form.guardianHost,
      billing: form.billing,
      guardianEntries: entries,
      schoolId: 1,
    });
    expect(payload.guardian_relationships?.[0]).toMatchObject({
      guardian_id: 42,
      relationship_type: 'mother',
    });
  });

  it('requires explicit billing guardian when multiple guardians exist', () => {
    const form = seedFamilyWithOneGuardianAndChild();
    form.billing.guardianEntries = [
      {
        kind: 'new',
        entryKey: 'additional-1',
        full_name: 'سعاد العلوي',
        relationship_type: 'mother',
        is_primary_contact: false,
      },
    ];
    form.billing.billingGuardianEntryKey = null;
    const result = validateFamilyRegistrationGuardiansStep(form, t);
    expect(result.valid).toBe(false);
    expect(result.errors.billingErrors?.billingGuardianSelection).toBeTruthy();
  });
});

describe('resolve guardians after first create', () => {
  it('maps new guardians to existing ids from create response', () => {
    const entries: StudentCreateGuardianEntry[] = [
      {
        kind: 'new',
        entryKey: 'new-primary',
        full_name: 'أحمد العلوي',
        relationship_type: 'father',
        is_primary_contact: true,
      },
    ];
    const resolved = extractResolvedGuardiansFromStudentPayload({
      id: 100,
      guardian_relationships: [
        {
          guardian_id: 77,
          guardian: { id: 77, name: 'أحمد العلوي' },
        },
      ],
    });
    const mapped = resolveFamilyGuardianEntriesToExisting(entries, resolved);
    expect(mapped.unresolvedNewCount).toBe(0);
    expect(mapped.entries[0]).toMatchObject({
      kind: 'existing',
      guardian_id: 77,
      entryKey: 'new-primary',
    });
  });
});

describe('family sequential submit safety', () => {
  it('registers multiple children with one shared existing guardian', async () => {
    const form = seedFamilyWithOneGuardianAndChild();
    form.billing.guardianSourceMode = 'existing';
    form.billing.linkedGuardianId = 55;
    form.children = [
      form.children[0],
      {
        ...form.children[0],
        localId: 'child-2',
        profile: {
          ...form.children[0].profile,
          firstName: 'سارة',
          lastName: 'العلوي',
        },
      },
    ];

    const posts: StudentCreatePayloadLike[] = [];
    const state = await runFamilyRegistrationSubmit({
      form,
      schoolId: 1,
      postStudent: async (payload) => {
        posts.push(payload as StudentCreatePayloadLike);
        return {
          success: true,
          data: {
            id: posts.length === 1 ? 201 : 202,
            guardian_relationships: [
              { guardian_id: 55, guardian: { id: 55, name: 'أحمد العلوي' } },
            ],
          },
          meta: {},
        };
      },
      mapErrorMessage: () => 'error',
    });

    expect(posts).toHaveLength(2);
    expect(posts[0].guardian_relationships?.[0]).toMatchObject({ guardian_id: 55 });
    expect(posts[1].guardian_relationships?.[0]).toMatchObject({ guardian_id: 55 });
    expect(familySubmitOutcomeSummary(state.results).kind).toBe('full_success');
    expect(state.lockedAgainstFullResubmit).toBe(true);
  });

  it('converts new guardian to existing after first child succeeds', async () => {
    const form = seedFamilyWithOneGuardianAndChild();
    form.children = [
      form.children[0],
      {
        ...form.children[0],
        localId: 'child-2',
        profile: {
          ...form.children[0].profile,
          firstName: 'نور',
          lastName: 'العلوي',
        },
      },
    ];

    const posts: Array<{ guardian?: unknown; guardian_id?: number }> = [];
    await runFamilyRegistrationSubmit({
      form,
      schoolId: 1,
      postStudent: async (payload) => {
        const rel = payload.guardian_relationships?.[0] as {
          guardian?: unknown;
          guardian_id?: number;
        };
        posts.push(rel);
        return {
          success: true,
          data: {
            id: posts.length === 1 ? 301 : 302,
            guardian_relationships: [
              { guardian_id: 88, guardian: { id: 88, name: 'أحمد العلوي' } },
            ],
          },
          meta: {},
        };
      },
      mapErrorMessage: () => 'error',
    });

    expect(posts[0].guardian).toBeTruthy();
    expect(posts[0].guardian_id).toBeUndefined();
    expect(posts[1].guardian_id).toBe(88);
    expect(posts[1].guardian).toBeUndefined();
  });

  it('exposes partial failure and allows safe retry only for failed children', async () => {
    const form = seedFamilyWithOneGuardianAndChild();
    form.billing.guardianSourceMode = 'existing';
    form.billing.linkedGuardianId = 9;
    form.children = [
      form.children[0],
      {
        ...form.children[0],
        localId: 'child-2',
        profile: {
          ...form.children[0].profile,
          firstName: 'هناء',
          lastName: 'العلوي',
        },
      },
    ];

    let calls = 0;
    const state = await runFamilyRegistrationSubmit({
      form,
      schoolId: 1,
      postStudent: async () => {
        calls += 1;
        if (calls === 1) {
          return {
            success: true,
            data: {
              id: 401,
              guardian_relationships: [{ guardian_id: 9, guardian: { id: 9, name: 'أحمد' } }],
            },
            meta: {},
          };
        }
        return {
          success: false,
          error: { code: 'validation_error', message: 'massar duplicate' },
          meta: {},
        };
      },
      mapErrorMessage: (error) => error?.message ?? 'error',
    });

    expect(familySubmitOutcomeSummary(state.results).kind).toBe('partial_success');
    expect(state.results[0].status).toBe('succeeded');
    expect(state.results[1].status).toBe('failed');
    expect(state.results[1].canRetrySafely).toBe(true);
    expect(shouldOfferFamilyFailedRetry(state.results)).toBe(true);
    expect(state.lockedAgainstFullResubmit).toBe(true);
  });

  it('marks ambiguous network failure and does not offer dangerous retry', async () => {
    const form = seedFamilyWithOneGuardianAndChild();
    form.billing.guardianSourceMode = 'existing';
    form.billing.linkedGuardianId = 9;

    const state = await runFamilyRegistrationSubmit({
      form,
      schoolId: 1,
      postStudent: async () => {
        throw new Error('network down');
      },
      mapErrorMessage: () => 'network',
    });

    expect(state.results[0].status).toBe('ambiguous');
    expect(state.results[0].canRetrySafely).toBe(false);
    expect(shouldOfferFamilyFailedRetry(state.results)).toBe(false);
  });

  it('blocks remaining children when new guardians cannot be resolved', async () => {
    const form = seedFamilyWithOneGuardianAndChild();
    form.children = [
      form.children[0],
      {
        ...form.children[0],
        localId: 'child-2',
        profile: {
          ...form.children[0].profile,
          firstName: 'إياد',
          lastName: 'العلوي',
        },
      },
    ];

    const state = await runFamilyRegistrationSubmit({
      form,
      schoolId: 1,
      postStudent: async () => ({
        success: true,
        // No guardian ids in response — cannot safely continue with nested new guardians.
        data: { id: 501 },
        meta: {},
      }),
      mapErrorMessage: () => 'error',
    });

    expect(state.results[0].status).toBe('succeeded');
    expect(state.results[1].status).toBe('blocked');
    expect(state.results[1].errorCode).toBe('guardians_unresolved');
  });

  it('summary flags missing billing responsible when multiple guardians', () => {
    const form = seedFamilyWithOneGuardianAndChild();
    form.billing.guardianEntries = [
      {
        kind: 'existing',
        entryKey: 'additional-1',
        guardian_id: 2,
        displayName: 'سعاد',
        relationship_type: 'mother',
        is_primary_contact: false,
      },
    ];
    form.billing.billingGuardianEntryKey = null;
    // Make primary complete as existing too for summary collect
    form.billing.guardianSourceMode = 'existing';
    form.billing.linkedGuardianId = 1;
    const summary = summarizeFamilyRegistration(form);
    expect(summary.missingBillingGuardian).toBe(true);
  });
});

type StudentCreatePayloadLike = {
  guardian_relationships?: Array<{ guardian_id?: number; guardian?: unknown }>;
};
