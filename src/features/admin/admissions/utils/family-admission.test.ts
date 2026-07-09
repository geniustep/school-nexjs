import { describe, expect, it } from 'vitest';
import {
  addFamilyChild,
  emptyFamilyAdmissionFormState,
  removeFamilyChild,
} from './family-admission-form-state';
import {
  buildCreateFamilyBatchPayload,
  buildFamilyBatchChildPayload,
  resolveChildResidenceAddress,
  validateFamilyAdmissionForm,
} from './family-admission-payload';
import {
  createFamilyAdmissionIdempotencyKey,
  FamilyAdmissionIdempotencySession,
} from './family-admission-idempotency';
import {
  familyBatchApplicationReference,
  normalizeFamilyBatchCreateData,
  normalizeFamilyBatchDetail,
} from './family-admission-normalize';
import { isFamilyBatchReplay, normalizeFamilyBatchCreateResponse } from './family-admission-response';
import {
  hasFamilyBatchLink,
  shouldShowFamilyBadge,
} from './family-admission-visibility';

const levels = [
  { id: 77, name: 'CP', cycle: 'primary', requires_stream: false },
  { id: 2447, name: '2 APIC', cycle: 'middle_school', requires_stream: false },
];

function sampleForm() {
  const form = emptyFamilyAdmissionFormState('2026-07-09');
  form.family = {
    guardian_name: 'أحمد العلوي',
    guardian_phone: '0612345678',
    guardian_whatsapp: '0612345678',
    guardian_email: 'ahmed@example.com',
    guardian_relationship: 'father',
    shared_address: 'الدار البيضاء',
    source_id: 10,
    academic_year_id: 1,
    first_contact_date: '2026-07-09',
  };
  form.children[0] = {
    ...form.children[0],
    child_first_name_ar: 'سلمى',
    child_last_name_ar: 'العلوي',
    gender: 'female',
    birth_date: '2018-05-15',
    requested_cycle_code: 'primary',
    requested_level_id: 77,
  };
  form.children[1] = {
    ...form.children[1],
    child_first_name_ar: 'ياسين',
    child_last_name_ar: 'العلوي',
    gender: 'male',
    birth_date: '2016-03-20',
    requested_cycle_code: 'middle_school',
    requested_level_id: 2447,
    use_different_address: true,
    residence_address: 'الرباط',
  };
  return form;
}

describe('family admission payload contract', () => {
  it('includes shared_contact in create payload', () => {
    const payload = buildCreateFamilyBatchPayload(sampleForm(), 3, 'fam-adm-test-key', levels);
    expect(payload.shared_contact.guardian_name).toBe('أحمد العلوي');
    expect(payload.shared_contact.guardian_phone).toBe('0612345678');
    expect(payload.shared_contact.relationship).toBe('father');
  });

  it('uses children instead of applications', () => {
    const payload = buildCreateFamilyBatchPayload(sampleForm(), 3, 'fam-adm-test-key', levels);
    expect(payload.children).toHaveLength(2);
    expect('applications' in payload).toBe(false);
  });

  it('does not send flat guardian fields outside shared_contact', () => {
    const payload = buildCreateFamilyBatchPayload(sampleForm(), 3, 'fam-adm-test-key', levels);
    expect('guardian_name' in payload).toBe(false);
    expect('guardian_phone' in payload).toBe(false);
    expect('guardian_whatsapp' in payload).toBe(false);
    expect('guardian_email' in payload).toBe(false);
    expect('relationship' in payload).toBe(false);
  });

  it('places shared_address at batch level', () => {
    const payload = buildCreateFamilyBatchPayload(sampleForm(), 3, 'fam-adm-test-key', levels);
    expect(payload.shared_address).toBe('الدار البيضاء');
  });

  it('inherits shared address for children by default', () => {
    const child = emptyFamilyAdmissionFormState().children[0];
    expect(resolveChildResidenceAddress(child, 'Casablanca')).toBe('Casablanca');
    expect(
      buildFamilyBatchChildPayload(child, 'Casablanca', levels).residence_address,
    ).toBe('Casablanca');
  });

  it('uses child address override when enabled', () => {
    const child = {
      ...emptyFamilyAdmissionFormState().children[0],
      use_different_address: true,
      residence_address: 'Rabat',
    };
    expect(resolveChildResidenceAddress(child, 'Casablanca')).toBe('Rabat');
    expect(
      buildFamilyBatchChildPayload(child, 'Casablanca', levels).residence_address,
    ).toBe('Rabat');
  });

  it('puts guardian_id inside shared_contact when linked', () => {
    const form = sampleForm();
    form.family.guardian_id = 42;
    const payload = buildCreateFamilyBatchPayload(form, 3, 'key', levels);
    expect(payload.shared_contact.guardian_id).toBe(42);
    expect('guardian_id' in payload).toBe(false);
  });

  it('requires at least two children', () => {
    const form = emptyFamilyAdmissionFormState();
    form.family.guardian_name = 'Parent';
    form.family.guardian_phone = '0612345678';
    form.family.academic_year_id = 3;
    form.children = [form.children[0]];

    expect(validateFamilyAdmissionForm(form)?.code).toBe('too_few_children');
  });

  it('supports add/remove child behavior with minimum guard', () => {
    let form = emptyFamilyAdmissionFormState();
    expect(form.children).toHaveLength(2);

    form = addFamilyChild(form);
    expect(form.children).toHaveLength(3);

    const thirdId = form.children[2].localId;
    form = removeFamilyChild(form, thirdId);
    expect(form.children).toHaveLength(2);
  });
});

describe('family admission idempotency', () => {
  it('keeps idempotency key stable across retry', () => {
    const session = new FamilyAdmissionIdempotencySession();
    const first = session.ensureKey();
    const second = session.ensureKey();
    expect(first).toBe(second);

    session.reset();
    expect(session.ensureKey()).not.toBe(first);
  });

  it('creates unique keys for new sessions', () => {
    const a = createFamilyAdmissionIdempotencyKey();
    const b = createFamilyAdmissionIdempotencyKey();
    expect(a).not.toBe(b);
  });
});

describe('family admission response mapping', () => {
  const backendCreate = {
    batch_id: 38,
    name: 'FB/2026/00038',
    family_reference: 'FAM-2026-00033',
    school_id: 3,
    application_count: 2,
    applications: [
      { id: 4155, name: 'ADM/2026/04158', student_name: 'ProbeA Smoke', state: 'new' },
      { id: 4156, name: 'ADM/2026/04159', student_name: 'ProbeB Smoke', state: 'new' },
    ],
  };

  it('maps create response via batch_id and application_count', () => {
    const normalized = normalizeFamilyBatchCreateData(backendCreate);
    expect(normalized.batch_id).toBe(38);
    expect(normalized.application_count).toBe(2);
    expect(normalized.applications).toHaveLength(2);
  });

  it('maps application name to display reference', () => {
    const ref = familyBatchApplicationReference(backendCreate.applications[0]);
    expect(ref).toBe('ADM/2026/04158');
  });

  it('maps 201 created success', () => {
    const outcome = normalizeFamilyBatchCreateResponse(
      { success: true, data: backendCreate, meta: { http_status: 201 } },
      201,
    );
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.replay).toBe(false);
      expect(outcome.data.batch_id).toBe(38);
      expect(outcome.data.application_count).toBe(2);
    }
  });

  it('maps 200 replay success', () => {
    const outcome = normalizeFamilyBatchCreateResponse(
      {
        success: true,
        data: { ...backendCreate, idempotent_replay: true },
        meta: { http_status: 200 },
      },
      200,
    );
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.replay).toBe(true);
    }
    expect(
      isFamilyBatchReplay({ ...backendCreate, idempotent_replay: true }, { http_status: 200 }, 200),
    ).toBe(true);
  });

  it('maps 409 idempotency conflict UI state', () => {
    const outcome = normalizeFamilyBatchCreateResponse({
      success: false,
      error: {
        code: 'family_batch_idempotency_conflict',
        message: 'Conflict',
      },
      meta: { http_status: 409 },
    });
    expect(outcome).toEqual({ kind: 'idempotency_conflict' });
  });

  it('maps GET detail for family panel', () => {
    const detail = normalizeFamilyBatchDetail({
      batch_id: 38,
      name: 'FB/2026/00038',
      family_reference: 'FAM-2026-00033',
      application_count: 2,
      shared_contact: {
        guardian_name: 'Probe Guardian',
        guardian_phone: '0612345678',
      },
      applications: backendCreate.applications,
    });
    expect(detail.batch_id).toBe(38);
    expect(detail.application_count).toBe(2);
    expect(detail.shared_contact?.guardian_name).toBe('Probe Guardian');
    expect(detail.applications[0].name).toBe('ADM/2026/04158');
  });
});

describe('family admission visibility', () => {
  it('shows family badge when family_size > 1', () => {
    expect(shouldShowFamilyBadge({ family_size: 3, family_batch_id: 9 })).toBe(true);
    expect(shouldShowFamilyBadge({ family_size: 1, family_batch_id: 9 })).toBe(false);
  });

  it('does not affect legacy admissions without family fields', () => {
    const legacy = {
      family_batch_id: undefined,
      family_size: undefined,
    };
    expect(shouldShowFamilyBadge(legacy)).toBe(false);
    expect(hasFamilyBatchLink(legacy)).toBe(false);
  });
});
