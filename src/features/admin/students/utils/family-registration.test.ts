import { describe, expect, it } from 'vitest';
import type { BatchRegistrationRequest } from '@/types/student-batch-registration';
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
import { FamilyBatchIdempotencyRegistry } from './family-registration-idempotency';
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

describe('family batch submit', () => {
  it('registers multiple children in one batch request with a shared existing guardian', async () => {
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

    const idempotency = new FamilyBatchIdempotencyRegistry();
    const posts: BatchRegistrationRequest[] = [];
    const state = await runFamilyRegistrationSubmit({
      form,
      schoolId: 1,
      idempotency,
      t,
      postBatch: async (payload) => {
        posts.push(payload);
        return {
          success: true,
          data: {
            idempotency_key: payload.idempotency_key,
            status: 'completed',
            requested_count: 2,
            succeeded_count: 2,
            failed_count: 0,
            guardians_resolved: [{ client_guardian_key: 'existing-55', guardian_id: 55 }],
            children: [
              {
                client_child_id: form.children[0].localId,
                status: 'succeeded',
                student_id: 201,
                student_reference: 'ST-201',
                replayed: false,
                error: null,
                retryable: false,
              },
              {
                client_child_id: 'child-2',
                status: 'succeeded',
                student_id: 202,
                student_reference: 'ST-202',
                replayed: false,
                error: null,
                retryable: false,
              },
            ],
          },
          meta: {},
        };
      },
      mapErrorMessage: () => 'error',
    });

    expect(posts).toHaveLength(1);
    expect(posts[0].guardians).toHaveLength(1);
    expect(posts[0].guardians[0]).toMatchObject({ guardian_id: 55 });
    expect(posts[0].children).toHaveLength(2);
    expect(JSON.stringify(posts[0])).not.toMatch(/"school_id"\s*:/);
    expect(JSON.stringify(posts[0])).not.toMatch(/"family_id"\s*:/);
    expect(familySubmitOutcomeSummary(state.results).kind).toBe('full_success');
    expect(state.lockedAgainstFullResubmit).toBe(true);
    expect(state.batchStatus).toBe('completed');
  });

  it('sends a new shared guardian once and maps client_guardian_key on both children', async () => {
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
    const idempotency = new FamilyBatchIdempotencyRegistry();
    const posts: BatchRegistrationRequest[] = [];
    await runFamilyRegistrationSubmit({
      form,
      schoolId: 1,
      idempotency,
      t,
      postBatch: async (payload) => {
        posts.push(payload);
        return {
          success: true,
          data: {
            idempotency_key: payload.idempotency_key,
            status: 'completed',
            requested_count: 2,
            succeeded_count: 2,
            failed_count: 0,
            guardians_resolved: [{ client_guardian_key: 'new-primary', guardian_id: 88 }],
            children: payload.children.map((child, index) => ({
              client_child_id: child.client_child_id,
              status: 'succeeded',
              student_id: 300 + index,
              replayed: false,
              error: null,
              retryable: false,
            })),
          },
          meta: {},
        };
      },
      mapErrorMessage: () => 'error',
    });

    expect(posts[0].guardians).toHaveLength(1);
    expect(posts[0].guardians[0]).toMatchObject({
      client_guardian_key: 'new-primary',
      guardian: { name: 'أحمد العلوي' },
    });
    expect(posts[0].children[0].guardian_relationships[0].client_guardian_key).toBe('new-primary');
    expect(posts[0].children[1].guardian_relationships[0].client_guardian_key).toBe('new-primary');
  });

  it('exposes partial failure and retries only failed children with stable keys', async () => {
    const form = seedFamilyWithOneGuardianAndChild();
    form.billing.guardianSourceMode = 'existing';
    form.billing.linkedGuardianId = 9;
    const firstId = form.children[0].localId;
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

    const idempotency = new FamilyBatchIdempotencyRegistry();
    const first = await runFamilyRegistrationSubmit({
      form,
      schoolId: 1,
      idempotency,
      t,
      postBatch: async (payload) => ({
        success: true,
        data: {
          idempotency_key: payload.idempotency_key,
          status: 'partially_completed',
          requested_count: 2,
          succeeded_count: 1,
          failed_count: 1,
          children: [
            {
              client_child_id: firstId,
              status: 'succeeded',
              student_id: 401,
              replayed: false,
              error: null,
              retryable: false,
            },
            {
              client_child_id: 'child-2',
              status: 'failed',
              student_id: null,
              error: { code: 'duplicate_student', message: 'massar duplicate', client_child_id: 'child-2' },
              retryable: true,
            },
          ],
        },
        meta: {},
      }),
      mapErrorMessage: (error) => error?.message ?? 'error',
    });

    expect(familySubmitOutcomeSummary(first.results).kind).toBe('partial_success');
    expect(first.results[0].status).toBe('succeeded');
    expect(first.results[1].status).toBe('failed');
    expect(first.results[1].canRetrySafely).toBe(true);
    expect(shouldOfferFamilyFailedRetry(first.results)).toBe(true);

    const childKey = idempotency.currentChildKey('child-2');
    const batchKey = idempotency.currentBatchKey();
    const retryPosts: BatchRegistrationRequest[] = [];
    const retry = await runFamilyRegistrationSubmit({
      form,
      schoolId: 1,
      idempotency,
      t,
      onlyLocalIds: ['child-2'],
      priorResults: first.results,
      postBatch: async (payload) => {
        retryPosts.push(payload);
        return {
          success: true,
          data: {
            idempotency_key: payload.idempotency_key,
            status: 'completed',
            requested_count: 1,
            succeeded_count: 1,
            failed_count: 0,
            children: [
              {
                client_child_id: 'child-2',
                status: 'succeeded',
                student_id: 402,
                replayed: false,
                error: null,
                retryable: false,
              },
            ],
          },
          meta: {},
        };
      },
      mapErrorMessage: () => 'error',
    });

    expect(retryPosts).toHaveLength(1);
    expect(retryPosts[0].children).toHaveLength(1);
    expect(retryPosts[0].children[0].client_child_id).toBe('child-2');
    expect(retryPosts[0].children[0].idempotency_key).toBe(childKey);
    expect(retryPosts[0].idempotency_key).toBe(batchKey);
    expect(retry.results.find((r) => r.localId === firstId)?.status).toBe('succeeded');
    expect(retry.results.find((r) => r.localId === 'child-2')?.status).toBe('succeeded');
  });

  it('marks ambiguous network failure and keeps keys for a safe later attempt', async () => {
    const form = seedFamilyWithOneGuardianAndChild();
    form.billing.guardianSourceMode = 'existing';
    form.billing.linkedGuardianId = 9;
    const idempotency = new FamilyBatchIdempotencyRegistry();
    const before = idempotency.ensureBatchKey();
    const childKey = idempotency.ensureChildKey(form.children[0].localId);

    const state = await runFamilyRegistrationSubmit({
      form,
      schoolId: 1,
      idempotency,
      t,
      postBatch: async () => {
        throw new Error('network down');
      },
      mapErrorMessage: () => 'network',
    });

    expect(state.results[0].status).toBe('ambiguous');
    expect(state.results[0].canRetrySafely).toBe(false);
    expect(shouldOfferFamilyFailedRetry(state.results)).toBe(false);
    expect(idempotency.currentBatchKey()).toBe(before);
    expect(idempotency.currentChildKey(form.children[0].localId)).toBe(childKey);
  });

  it('treats replayed child as success without offering resubmit', async () => {
    const form = seedFamilyWithOneGuardianAndChild();
    form.billing.guardianSourceMode = 'existing';
    form.billing.linkedGuardianId = 9;
    const idempotency = new FamilyBatchIdempotencyRegistry();
    const state = await runFamilyRegistrationSubmit({
      form,
      schoolId: 1,
      idempotency,
      t,
      postBatch: async (payload) => ({
        success: true,
        data: {
          idempotency_key: payload.idempotency_key,
          status: 'completed',
          requested_count: 1,
          succeeded_count: 1,
          failed_count: 0,
          replayed: true,
          children: [
            {
              client_child_id: form.children[0].localId,
              status: 'succeeded',
              student_id: 777,
              replayed: true,
              error: null,
              retryable: false,
            },
          ],
        },
        meta: {},
      }),
      mapErrorMessage: () => 'error',
    });
    expect(state.results[0].status).toBe('succeeded');
    expect(state.results[0].replayed).toBe(true);
    expect(state.lockedAgainstFullResubmit).toBe(true);
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
    form.billing.guardianSourceMode = 'existing';
    form.billing.linkedGuardianId = 1;
    const summary = summarizeFamilyRegistration(form);
    expect(summary.missingBillingGuardian).toBe(true);
  });

  it('keeps missing_capability as a per-child failure without wiping the form draft keys', async () => {
    const form = seedFamilyWithOneGuardianAndChild();
    form.billing.guardianSourceMode = 'existing';
    form.billing.linkedGuardianId = 9;
    const firstId = form.children[0].localId;
    form.children = [
      form.children[0],
      {
        ...form.children[0],
        localId: 'child-2',
        profile: { ...form.children[0].profile, firstName: 'مريم', lastName: 'العلوي' },
      },
    ];
    const idempotency = new FamilyBatchIdempotencyRegistry();
    const batchKey = idempotency.ensureBatchKey();
    const state = await runFamilyRegistrationSubmit({
      form,
      schoolId: 1,
      idempotency,
      t,
      postBatch: async (payload) => ({
        success: true,
        data: {
          idempotency_key: payload.idempotency_key,
          status: 'partially_completed',
          requested_count: 2,
          succeeded_count: 1,
          failed_count: 1,
          children: [
            {
              client_child_id: firstId,
              status: 'succeeded',
              student_id: 501,
              replayed: false,
              error: null,
              retryable: false,
            },
            {
              client_child_id: 'child-2',
              status: 'failed',
              student_id: null,
              error: {
                code: 'missing_capability',
                message: 'finance.assign_plan',
                client_child_id: 'child-2',
              },
              retryable: false,
            },
          ],
        },
        meta: {},
      }),
      mapErrorMessage: (error) => error?.message ?? 'error',
    });
    expect(state.results[1].errorCode).toBe('missing_capability');
    expect(state.results[1].canRetrySafely).toBe(false);
    expect(idempotency.currentBatchKey()).toBe(batchKey);
    expect(form.children).toHaveLength(2);
  });

  it('surfaces transport-level idempotency conflict without regenerating keys', async () => {
    const form = seedFamilyWithOneGuardianAndChild();
    form.billing.guardianSourceMode = 'existing';
    form.billing.linkedGuardianId = 9;
    const idempotency = new FamilyBatchIdempotencyRegistry();
    const batchKey = idempotency.ensureBatchKey();
    const childKey = idempotency.ensureChildKey(form.children[0].localId);
    const state = await runFamilyRegistrationSubmit({
      form,
      schoolId: 1,
      idempotency,
      t,
      postBatch: async () => ({
        success: false,
        error: {
          code: 'idempotency_conflict',
          message: 'conflict',
        },
        meta: {},
      }),
      mapErrorMessage: (error) => error?.message ?? 'error',
    });
    expect(state.results[0].status).toBe('failed');
    expect(state.results[0].canRetrySafely).toBe(false);
    expect(idempotency.currentBatchKey()).toBe(batchKey);
    expect(idempotency.currentChildKey(form.children[0].localId)).toBe(childKey);
  });
});
