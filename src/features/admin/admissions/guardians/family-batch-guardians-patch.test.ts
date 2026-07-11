import { describe, expect, it } from 'vitest';
import { endpoints } from '@/lib/api/endpoints';
import {
  createPrimaryGuardianDraft,
  emptyGuardianDraft,
  hydrateAdmissionGuardians,
  normalizeAdmissionGuardiansForDisplay,
  setPrimaryGuardian,
} from './index';
import {
  canonicalizeFamilyGuardiansForComparison,
  familyBatchGuardiansHaveChanges,
} from './canonicalize-family-guardians-for-comparison';
import {
  buildFamilyBatchChildKeyMaps,
  buildPatchFamilyBatchGuardiansPayload,
  familyBatchGuardiansPatchEndpoint,
  isMaskedIdentityNumber,
  validateFamilyBatchGuardiansPatchDraft,
} from './serialize-family-batch-guardians-patch';
import { canEditFamilyBatchGuardians } from '../utils/family-batch-guardians-edit';
import { orderFamilyBatchApplicationsForCurrentChild } from '../utils/family-batch-current-child';
import { updateGuardianDraft } from './guardian-draft';

describe('family batch guardians PATCH contract', () => {
  it('uses PATCH path /family-batches/{id}/guardians', () => {
    expect(familyBatchGuardiansPatchEndpoint(80)).toBe(
      '/admin/admissions/family-batches/80/guardians',
    );
    expect(endpoints.admin.admissionFamilyBatchGuardians(80)).toBe(
      '/admin/admissions/family-batches/80/guardians',
    );
  });

  it('hydrates edit form from guardians[] with one primary', () => {
    const maps = buildFamilyBatchChildKeyMaps([
      { id: 4268, student_name: 'Child A' },
      { id: 4269, student_name: 'Child B' },
    ]);
    const drafts = hydrateAdmissionGuardians({
      guardians: [
        {
          guardian_id: 11,
          name: 'Father',
          phone: '0611111111',
          is_primary_contact: true,
          applies_to_all_children: true,
          identity_document: {
            document_type: 'national_id',
            document_number_masked: 'AB****12',
          },
        },
      ],
      childIdToClientKey: maps.childIdToClientKey,
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].isPrimaryContact).toBe(true);
    expect(drafts[0].identityDirty).toBe(false);
    expect(drafts[0].identityDocument.documentNumber).toBe('');
    expect(drafts[0].identityDocument.documentNumberMasked).toBe('AB****12');
  });

  it('full replacement sends father and mother together with linked_child_ids', () => {
    const maps = buildFamilyBatchChildKeyMaps([
      { id: 4268, student_name: 'A' },
      { id: 4269, student_name: 'B' },
    ]);
    const father = {
      ...createPrimaryGuardianDraft(),
      guardianId: 11,
      name: 'Father',
      phone: '0611111111',
      identityDirty: false,
    };
    const mother = {
      ...emptyGuardianDraft({ isPrimaryContact: false, appliesToAllChildren: false }),
      name: 'Mother',
      phone: '0622222222',
      linkedChildClientKeys: [maps.childClientKeys[0]],
      identityDirty: true,
      identityDocument: {
        ...emptyGuardianDraft().identityDocument,
        documentType: 'passport' as const,
        documentNumber: 'P999',
      },
    };
    const payload = buildPatchFamilyBatchGuardiansPayload(
      [father, mother],
      maps.childClientKeyToId,
    );
    expect(payload.guardians).toHaveLength(2);
    expect(payload.guardians[0].guardian_id).toBe(11);
    expect(payload.guardians[0].name).toBe('Father');
    expect(payload.guardians[0].identity_document).toBeUndefined();
    expect(payload.guardians[1].name).toBe('Mother');
    expect(payload.guardians[1].linked_child_ids).toEqual([4268]);
    expect(payload.guardians[1].linked_child_indexes).toBeUndefined();
    expect(payload.guardians[1].identity_document?.document_number).toBe('P999');
  });

  it('uses linked_child_ids not indexes for all_children false', () => {
    const maps = buildFamilyBatchChildKeyMaps([
      { id: 10, student_name: 'X' },
      { id: 20, student_name: 'Y' },
    ]);
    const g = {
      ...emptyGuardianDraft({ appliesToAllChildren: false }),
      name: 'G',
      phone: '0600000000',
      isPrimaryContact: true,
      linkedChildClientKeys: [maps.childClientKeys[1]],
    };
    const payload = buildPatchFamilyBatchGuardiansPayload([g], maps.childClientKeyToId);
    expect(payload.guardians[0].linked_child_ids).toEqual([20]);
    expect('linked_child_indexes' in (payload.guardians[0] as object)).toBe(false);
  });

  it('all_children true omits linked_child_ids', () => {
    const maps = buildFamilyBatchChildKeyMaps([{ id: 1, student_name: 'A' }]);
    const g = {
      ...createPrimaryGuardianDraft(),
      name: 'P',
      phone: '0611111111',
      appliesToAllChildren: true,
    };
    const payload = buildPatchFamilyBatchGuardiansPayload([g], maps.childClientKeyToId);
    expect(payload.guardians[0].all_children).toBe(true);
    expect(payload.guardians[0].linked_child_ids).toBeUndefined();
  });

  it('rejects child outside batch', () => {
    const maps = buildFamilyBatchChildKeyMaps([{ id: 1, student_name: 'A' }]);
    const g = {
      ...createPrimaryGuardianDraft(),
      name: 'P',
      phone: '0611111111',
      appliesToAllChildren: false,
      linkedChildClientKeys: ['family-child-999'],
    };
    const err = validateFamilyBatchGuardiansPatchDraft([g], {
      childClientKeys: maps.childClientKeys,
      childClientKeyToId: maps.childClientKeyToId,
      batchChildIds: [1],
    });
    expect(err?.messageKey).toContain('childNotInBatch');
  });

  it('keeps exactly one primary when adding second guardian', () => {
    let list = [createPrimaryGuardianDraft(), emptyGuardianDraft()];
    list[0] = { ...list[0], name: 'A', phone: '0611111111' };
    list[1] = { ...list[1], name: 'B', phone: '0622222222' };
    list = setPrimaryGuardian(list, list[1].clientKey);
    expect(list.filter((g) => g.isPrimaryContact)).toHaveLength(1);
    expect(list[1].isPrimaryContact).toBe(true);
  });

  it('does not dedupe two different guardians with same phone', () => {
    const maps = buildFamilyBatchChildKeyMaps([{ id: 1, student_name: 'A' }]);
    const a = {
      ...createPrimaryGuardianDraft(),
      guardianId: 1,
      name: 'A',
      phone: '0600000000',
    };
    const b = {
      ...emptyGuardianDraft(),
      guardianId: 2,
      name: 'B',
      phone: '0600000000',
    };
    const payload = buildPatchFamilyBatchGuardiansPayload([a, b], maps.childClientKeyToId);
    expect(payload.guardians).toHaveLength(2);
  });

  it('never treats masked value as document_number', () => {
    expect(isMaskedIdentityNumber('AB****12')).toBe(true);
    const maps = buildFamilyBatchChildKeyMaps([{ id: 1, student_name: 'A' }]);
    const g = {
      ...createPrimaryGuardianDraft(),
      name: 'P',
      phone: '0611111111',
      identityDirty: true,
      identityDocument: {
        ...emptyGuardianDraft().identityDocument,
        documentType: 'national_id' as const,
        documentNumber: 'XX****99',
        documentNumberMasked: 'XX****99',
      },
    };
    const err = validateFamilyBatchGuardiansPatchDraft([g], {
      childClientKeys: maps.childClientKeys,
      childClientKeyToId: maps.childClientKeyToId,
      batchChildIds: [1],
    });
    expect(err?.code).toBe('identity_number_required');
    const payload = buildPatchFamilyBatchGuardiansPayload([g], maps.childClientKeyToId);
    expect(payload.guardians[0].identity_document).toBeUndefined();
  });

  it('omits identity_document when not dirty to preserve stored identity', () => {
    const maps = buildFamilyBatchChildKeyMaps([{ id: 1, student_name: 'A' }]);
    const g = {
      ...createPrimaryGuardianDraft(),
      guardianId: 5,
      name: 'P',
      phone: '0611111111',
      identityDirty: false,
      identityDocument: {
        ...emptyGuardianDraft().identityDocument,
        documentType: 'national_id' as const,
        documentNumberMasked: 'AB****',
      },
    };
    const payload = buildPatchFamilyBatchGuardiansPayload([g], maps.childClientKeyToId);
    expect(payload.guardians[0].identity_document).toBeUndefined();
  });

  it('sends identity_document when dirty with real number', () => {
    const maps = buildFamilyBatchChildKeyMaps([{ id: 1, student_name: 'A' }]);
    const g = {
      ...createPrimaryGuardianDraft(),
      name: 'P',
      phone: '0611111111',
      identityDirty: true,
      identityDocument: {
        ...emptyGuardianDraft().identityDocument,
        documentType: 'national_id' as const,
        documentNumber: 'AB123456',
        issuingCountry: 'MA',
      },
    };
    const payload = buildPatchFamilyBatchGuardiansPayload([g], maps.childClientKeyToId);
    expect(payload.guardians[0].identity_document?.document_number).toBe('AB123456');
    expect(JSON.stringify(payload)).not.toContain('AB****');
  });

  it('removing an additional guardian only drops them from replacement list', () => {
    const maps = buildFamilyBatchChildKeyMaps([{ id: 1, student_name: 'A' }]);
    const primary = {
      ...createPrimaryGuardianDraft(),
      guardianId: 1,
      name: 'Keep',
      phone: '0611111111',
    };
    const payload = buildPatchFamilyBatchGuardiansPayload([primary], maps.childClientKeyToId);
    expect(payload.guardians).toHaveLength(1);
    expect(JSON.stringify(payload).toLowerCase()).not.toContain('delete');
  });

  it('gates edit button on allowed_actions.edit_guardians', () => {
    expect(canEditFamilyBatchGuardians({ edit_guardians: true })).toBe(true);
    expect(canEditFamilyBatchGuardians({ edit_guardians: false })).toBe(false);
    expect(canEditFamilyBatchGuardians(null)).toBe(false);
  });

  it('display after two-guardian response shows two cards without primary dup', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [
        { name: 'Father', is_primary_contact: true },
        { name: 'Mother', is_primary_contact: false },
      ],
      legacyFlat: { guardian_name: 'Father', guardian_phone: '0611111111' },
      sharedContact: { guardian_name: 'Father', guardian_phone: '0611111111' },
    });
    expect(list).toHaveLength(2);
    expect(list.filter((g) => g.isPrimaryContact)).toHaveLength(1);
  });

  it('keeps opened child first after refetch ordering', () => {
    const ordered = orderFamilyBatchApplicationsForCurrentChild(
      [
        { id: 4268, student_name: 'Sibling' },
        { id: 4269, student_name: 'Opened' },
      ],
      4269,
    );
    expect(ordered[0].id).toBe(4269);
  });
});

describe('family batch guardians dirty / canonicalize', () => {
  const maps = buildFamilyBatchChildKeyMaps([
    { id: 4268, student_name: 'Child A' },
    { id: 4269, student_name: 'Child B' },
  ]);

  function hydrateFather() {
    return hydrateAdmissionGuardians({
      guardians: [
        {
          guardian_id: 11,
          name: 'Father',
          phone: '0611111111',
          is_primary_contact: true,
          applies_to_all_children: true,
          identity_document: {
            document_type: 'national_id',
            document_number_masked: 'AB****12',
          },
        },
      ],
      childIdToClientKey: maps.childIdToClientKey,
    });
  }

  it('detects no changes when only masked identity is present and untouched', () => {
    const baseline = hydrateFather();
    const current = baseline.map((g) => ({
      ...g,
      linkedChildClientKeys: [...g.linkedChildClientKeys],
      identityDocument: { ...g.identityDocument },
    }));
    expect(
      familyBatchGuardiansHaveChanges(baseline, current, maps.childClientKeyToId),
    ).toBe(false);
    expect(
      canonicalizeFamilyGuardiansForComparison(baseline, maps.childClientKeyToId)[0]
        .identity,
    ).toBeNull();
  });

  it('detects adding a new guardian as a change', () => {
    const baseline = hydrateFather();
    const current = [
      ...baseline,
      {
        ...emptyGuardianDraft({ isPrimaryContact: false, appliesToAllChildren: true }),
        name: 'Mother',
        phone: '0622222222',
      },
    ];
    expect(
      familyBatchGuardiansHaveChanges(baseline, current, maps.childClientKeyToId),
    ).toBe(true);
  });

  it('detects identity type/date edit when identityDirty without relying only on document_number', () => {
    const baseline = hydrateFather();
    let current = updateGuardianDraft(baseline, baseline[0].clientKey, {
      identityDocument: {
        ...baseline[0].identityDocument,
        documentType: 'passport',
        issueDate: '2024-01-15',
      },
    });
    expect(current[0].identityDirty).toBe(true);
    expect(
      familyBatchGuardiansHaveChanges(baseline, current, maps.childClientKeyToId),
    ).toBe(true);
  });

  it('detects linked_child_ids change ignoring order-only differences', () => {
    const baseline = [
      {
        ...createPrimaryGuardianDraft(),
        guardianId: 11,
        name: 'Father',
        phone: '0611111111',
        appliesToAllChildren: false,
        linkedChildClientKeys: [maps.childClientKeys[0], maps.childClientKeys[1]],
        identityDirty: false,
      },
    ];
    const reordered = [
      {
        ...baseline[0],
        linkedChildClientKeys: [maps.childClientKeys[1], maps.childClientKeys[0]],
      },
    ];
    expect(
      familyBatchGuardiansHaveChanges(baseline, reordered, maps.childClientKeyToId),
    ).toBe(false);

    const dropped = [
      {
        ...baseline[0],
        linkedChildClientKeys: [maps.childClientKeys[0]],
      },
    ];
    expect(
      familyBatchGuardiansHaveChanges(baseline, dropped, maps.childClientKeyToId),
    ).toBe(true);
  });

  it('does not treat whitespace-only text diffs as changes', () => {
    const baseline = hydrateFather();
    const current = [
      {
        ...baseline[0],
        name: '  Father  ',
        phone: '0611111111',
      },
    ];
    expect(
      familyBatchGuardiansHaveChanges(baseline, current, maps.childClientKeyToId),
    ).toBe(false);
  });
});
