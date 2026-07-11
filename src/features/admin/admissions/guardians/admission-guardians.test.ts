import { describe, expect, it } from 'vitest';
import {
  canRemoveGuardian,
  createPrimaryGuardianDraft,
  deriveLegacyGuardianFields,
  deriveSharedContactFromPrimary,
  emptyGuardianDraft,
  emptyGuardianIdentityDraft,
  guardianIdAlreadyLinked,
  hydrateAdmissionGuardians,
  hydrateGuardiansFromLegacyFlat,
  hydrateGuardiansFromSharedContact,
  isAdmissionGuardianWarningBlocking,
  pruneGuardianChildLinks,
  removeGuardianDraft,
  serializeGuardiansPayload,
  setPrimaryGuardian,
  translateAdmissionGuardianWarning,
  validateGuardianIdentity,
  validateGuardiansDraft,
} from './index';
import { buildCreateAdmissionPayload, emptyAdmissionCreateForm } from '../utils/admission-create-payload';
import {
  emptyFamilyAdmissionFormState,
  removeFamilyChild,
} from '../utils/family-admission-form-state';
import { buildCreateFamilyBatchPayload as buildFamilyPayload } from '../utils/family-admission-payload';

const levels = [{ id: 77, name: 'CP', cycle: 'primary', requires_stream: false }];

describe('hydrate guardians', () => {
  it('normalizes guardians[] response', () => {
    const drafts = hydrateAdmissionGuardians({
      guardians: [
        {
          name: 'Parent A',
          phone: '0611111111',
          is_primary_contact: true,
          identity_document: {
            document_type: 'national_id',
            document_number_masked: 'AB****12',
            document_number: 'SHOULD-NOT-USE-IN-UI-LIST',
          },
        },
        {
          name: 'Parent B',
          phone: '0622222222',
          is_primary_contact: false,
          is_accompanying_guardian: true,
          applies_to_all_children: false,
          linked_child_indexes: [0],
        },
      ],
      childClientKeysByIndex: ['c0', 'c1'],
    });
    expect(drafts).toHaveLength(2);
    expect(drafts[0].isPrimaryContact).toBe(true);
    expect(drafts[0].identityDocument.documentNumberMasked).toBe('AB****12');
    expect(drafts[1].isAccompanyingGuardian).toBe(true);
    expect(drafts[1].linkedChildClientKeys).toEqual(['c0']);
  });

  it('falls back from individual guardian_* fields', () => {
    const drafts = hydrateGuardiansFromLegacyFlat({
      guardian_name: 'Legacy Parent',
      guardian_phone: '0600000000',
      relationship: 'father',
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].isPrimaryContact).toBe(true);
    expect(drafts[0].name).toBe('Legacy Parent');
    expect(drafts[0].relationship).toBe('father');
  });

  it('falls back from family shared_contact', () => {
    const drafts = hydrateGuardiansFromSharedContact({
      guardian_id: 9,
      guardian_name: 'Shared',
      guardian_phone: '0612345678',
      relationship: 'mother',
    });
    expect(drafts[0].guardianId).toBe(9);
    expect(drafts[0].name).toBe('Shared');
  });
});

describe('serialize guardians', () => {
  it('serializes individual admission with two guardians and derives legacy from primary', () => {
    const form = emptyAdmissionCreateForm('2026-07-11');
    form.child_first_name_ar = 'طفل';
    form.child_last_name_ar = 'اختبار';
    form.gender = 'male';
    form.birth_date = '2018-01-01';
    form.requested_level_id = 77;
    form.academic_year_id = 1;
    const primary = {
      ...createPrimaryGuardianDraft(),
      name: 'Primary',
      phone: '0611111111',
      relationship: 'father',
      identityDocument: {
        ...emptyGuardianIdentityDraft(),
        documentType: 'national_id' as const,
        documentNumber: 'A123',
        issuingCountry: 'MA',
      },
    };
    const secondary = {
      ...emptyGuardianDraft({ isPrimaryContact: false }),
      name: 'Secondary',
      phone: '0622222222',
      relationship: 'mother',
    };
    form.guardians = [primary, secondary];
    const payload = buildCreateAdmissionPayload(form, 3, levels);
    expect(payload.guardians).toHaveLength(2);
    expect(payload.guardians?.[0].is_primary_contact).toBe(true);
    expect(payload.guardians?.[0].identity_document?.document_type).toBe('national_id');
    expect(payload.guardian_name).toBe('Primary');
    expect(payload.guardian_phone).toBe('0611111111');
    expect(payload.guardian_name).toBe(payload.guardians?.[0].name);
  });

  it('derives shared_contact from primary only', () => {
    const guardians = [
      {
        ...createPrimaryGuardianDraft(),
        name: 'Main',
        phone: '0611111111',
        whatsapp: '0611111111',
      },
      {
        ...emptyGuardianDraft(),
        name: 'Other',
        phone: '0622222222',
      },
    ];
    const shared = deriveSharedContactFromPrimary(guardians);
    expect(shared.guardian_name).toBe('Main');
    expect(shared.guardian_phone).toBe('0611111111');
    expect(JSON.stringify(shared)).not.toContain('Other');
  });
});

describe('guardian draft rules', () => {
  it('prevents two primaries via setPrimaryGuardian', () => {
    let list = [
      createPrimaryGuardianDraft(),
      emptyGuardianDraft({ isPrimaryContact: false }),
    ];
    list = setPrimaryGuardian(list, list[1].clientKey);
    expect(list.filter((g) => g.isPrimaryContact)).toHaveLength(1);
    expect(list[1].isPrimaryContact).toBe(true);
  });

  it('detects duplicate guardian_id', () => {
    const a = { ...createPrimaryGuardianDraft(), guardianId: 5, name: 'A', phone: '0611111111' };
    const b = { ...emptyGuardianDraft(), guardianId: 5, name: 'B', phone: '0622222222' };
    expect(guardianIdAlreadyLinked([a, b], 5)).toBe(true);
    expect(validateGuardiansDraft([a, b], { mode: 'individual' })?.code).toBe(
      'duplicate_guardian_id',
    );
  });

  it('family all_children true omits linked indexes', () => {
    const g = {
      ...createPrimaryGuardianDraft(),
      name: 'P',
      phone: '0611111111',
      appliesToAllChildren: true,
    };
    const payload = serializeGuardiansPayload([g], {
      mode: 'family',
      childClientKeysInOrder: ['c0', 'c1'],
    });
    expect(payload[0].applies_to_all_children).toBe(true);
    expect(payload[0].linked_child_indexes).toBeUndefined();
  });

  it('family specific children emit linked_child_indexes from order', () => {
    const g = {
      ...createPrimaryGuardianDraft(),
      name: 'P',
      phone: '0611111111',
      appliesToAllChildren: false,
      linkedChildClientKeys: ['c1'],
    };
    const payload = serializeGuardiansPayload([g], {
      mode: 'family',
      childClientKeysInOrder: ['c0', 'c1', 'c2'],
    });
    expect(payload[0].linked_child_indexes).toEqual([1]);
  });

  it('recomputes indexes after child removal', () => {
    let form = emptyFamilyAdmissionFormState('2026-07-11');
    form = {
      ...form,
      children: [
        ...form.children,
        {
          ...form.children[0],
          localId: 'fam-child-extra',
          child_first_name_ar: 'C',
          gender: 'f',
          birth_date: '2019-01-01',
          requested_level_id: 77,
        },
      ],
    };
    const [c0, c1] = form.children;
    form = {
      ...form,
      guardians: [
        {
          ...createPrimaryGuardianDraft(),
          name: 'P',
          phone: '0611111111',
          appliesToAllChildren: false,
          linkedChildClientKeys: [c0.localId, c1.localId],
        },
      ],
      family: { ...form.family, academic_year_id: 1 },
      children: form.children.map((c, i) =>
        i === 0
          ? { ...c, child_first_name_ar: 'A', gender: 'f', birth_date: '2018-01-01', requested_level_id: 77 }
          : i === 1
            ? { ...c, child_first_name_ar: 'B', gender: 'm', birth_date: '2016-01-01', requested_level_id: 77 }
            : c,
      ),
    };
    form = removeFamilyChild(form, c0.localId);
    expect(form.guardians[0].linkedChildClientKeys).toEqual([c1.localId]);
    const payload = buildFamilyPayload(form, 3, 'key', levels);
    expect(payload.guardians?.[0].linked_child_indexes).toEqual([0]);
  });

  it('uses linked_child_ids when editing with id map', () => {
    const childKey = 'child-a';
    const g = {
      ...createPrimaryGuardianDraft(),
      name: 'P',
      phone: '0611111111',
      appliesToAllChildren: false,
      linkedChildClientKeys: [childKey],
    };
    const payload = serializeGuardiansPayload([g], {
      mode: 'family',
      childClientKeysInOrder: [childKey],
      childClientKeyToId: new Map([[childKey, 4155]]),
    });
    expect(payload[0].linked_child_ids).toEqual([4155]);
    expect(payload[0].linked_child_indexes).toBeUndefined();
  });

  it('validates identity type requires number and dates order', () => {
    expect(
      validateGuardianIdentity({
        ...emptyGuardianIdentityDraft(),
        documentType: 'passport',
        documentNumber: '',
      })?.code,
    ).toBe('identity_number_required');
    expect(
      validateGuardianIdentity({
        ...emptyGuardianIdentityDraft(),
        documentType: 'passport',
        documentNumber: 'X',
        issueDate: '2024-01-01',
        expiryDate: '2023-01-01',
      })?.code,
    ).toBe('identity_dates_invalid');
  });

  it('identity warnings are non-blocking', () => {
    expect(isAdmissionGuardianWarningBlocking('guardian_identity_missing')).toBe(false);
    expect(
      translateAdmissionGuardianWarning('guardian_identity_missing', (k) => k),
    ).toBe('admin.admissions.guardians.warnings.identityMissing');
  });

  it('removing additional guardian does not call delete and keeps primary', () => {
    const primary = createPrimaryGuardianDraft();
    const extra = emptyGuardianDraft({ isPrimaryContact: false });
    expect(canRemoveGuardian([primary, extra], extra.clientKey)).toBe(true);
    const next = removeGuardianDraft([primary, extra], extra.clientKey);
    expect(next).toHaveLength(1);
    expect(next[0].isPrimaryContact).toBe(true);
    // No person-delete side effect — pure state transform.
    expect(next[0].guardianId).toBeUndefined();
  });

  it('prunes deleted child keys from guardian links', () => {
    const g = {
      ...createPrimaryGuardianDraft(),
      appliesToAllChildren: false,
      linkedChildClientKeys: ['a', 'b'],
    };
    const pruned = pruneGuardianChildLinks([g], new Set(['b']));
    expect(pruned[0].linkedChildClientKeys).toEqual(['b']);
  });
});

describe('family batch payload with guardians', () => {
  it('includes guardians and shared_contact from primary', () => {
    const form = emptyFamilyAdmissionFormState('2026-07-11');
    form.family.academic_year_id = 1;
    form.guardians = [
      {
        ...createPrimaryGuardianDraft(),
        name: 'أحمد العلوي',
        phone: '0612345678',
        relationship: 'father',
        appliesToAllChildren: true,
      },
      {
        ...emptyGuardianDraft(),
        name: 'أمينة',
        phone: '0699999999',
        appliesToAllChildren: false,
        linkedChildClientKeys: [form.children[0].localId],
      },
    ];
    form.children = form.children.map((c, i) => ({
      ...c,
      child_first_name_ar: i === 0 ? 'سلمى' : 'ياسين',
      child_last_name_ar: 'العلوي',
      gender: i === 0 ? 'female' : 'male',
      birth_date: '2018-05-15',
      requested_level_id: 77,
    }));
    const payload = buildFamilyPayload(form, 3, 'fam-key', levels);
    expect(payload.guardians).toHaveLength(2);
    expect(payload.shared_contact.guardian_name).toBe('أحمد العلوي');
    expect(payload.guardians?.[1].linked_child_indexes).toEqual([0]);
    expect(payload.shared_contact).not.toHaveProperty('identity_document');
  });
});
