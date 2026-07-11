import { describe, expect, it } from 'vitest';
import {
  normalizeAdmissionGuardiansForDisplay,
  normalizeGuardianIdentityForDisplay,
  resolveGuardianIdentityAttachmentPreviewUrl,
} from './normalize-admission-guardians-display';

describe('normalizeAdmissionGuardiansForDisplay', () => {
  it('normalizes guardians[] with two guardians', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [
        {
          name: 'Father',
          phone: '0611111111',
          relationship: 'father',
          is_primary_contact: true,
          identity_document: {
            document_type: 'national_id',
            document_number: 'FULL-SECRET-SHOULD-NOT-APPEAR',
            document_number_masked: 'AB****12',
            issuing_country: 'MA',
          },
        },
        {
          name: 'Mother',
          phone: '0622222222',
          relationship: 'mother',
          is_primary_contact: false,
          is_accompanying_guardian: true,
          applies_to_all_children: false,
          linked_child_ids: [101, 102],
        },
      ],
      children: [
        { id: 101, name: 'Child A' },
        { id: 102, name: 'Child B' },
      ],
    });

    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('Father');
    expect(list[1].name).toBe('Mother');
    expect(list[1].isAccompanyingGuardian).toBe(true);
    expect(list[1].linkedChildLabels).toEqual(['Child A', 'Child B']);
  });

  it('sorts primary guardian first', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [
        { name: 'Second', is_primary_contact: false },
        { name: 'Primary', is_primary_contact: true },
      ],
    });
    expect(list.map((g) => g.name)).toEqual(['Primary', 'Second']);
    expect(list.filter((g) => g.isPrimaryContact)).toHaveLength(1);
  });

  it('falls back from guardian_* for old individual', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: null,
      legacyFlat: {
        guardian_name: 'Legacy Parent',
        guardian_phone: '0600000000',
        relationship: 'father',
      },
    });
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Legacy Parent');
    expect(list[0].isPrimaryContact).toBe(true);
  });

  it('falls back from shared_contact for old family batch', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [],
      sharedContact: {
        guardian_id: 9,
        guardian_name: 'Shared',
        guardian_phone: '0612345678',
        relationship: 'mother',
      },
    });
    expect(list).toHaveLength(1);
    expect(list[0].guardianId).toBe(9);
    expect(list[0].name).toBe('Shared');
  });

  it('does not duplicate primary when guardians[] and legacy coexist', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [
        { name: 'From Guardians', phone: '0611111111', is_primary_contact: true },
        { name: 'Second', phone: '0622222222', is_primary_contact: false },
      ],
      legacyFlat: {
        guardian_name: 'Legacy Duplicate',
        guardian_phone: '0611111111',
      },
      sharedContact: {
        guardian_name: 'Shared Duplicate',
        guardian_phone: '0611111111',
      },
    });
    expect(list).toHaveLength(2);
    expect(list.map((g) => g.name)).toEqual(['From Guardians', 'Second']);
    expect(list.some((g) => g.name.includes('Duplicate'))).toBe(false);
  });

  it('exposes identity_document for display without full number', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [
        {
          name: 'Parent',
          is_primary_contact: true,
          identity_document: {
            document_type: 'passport',
            document_number: 'P123456789',
            document_number_masked: 'P12****89',
            issue_date: '2020-01-01',
            expiry_date: '2030-01-01',
            verification_state: 'reviewed',
            front_attachment_id: 55,
            back_attachment_id: 56,
          },
        },
      ],
    });
    const id = list[0].identity;
    expect(id.hasDocument).toBe(true);
    expect(id.documentType).toBe('passport');
    expect(id.documentNumberMasked).toBe('P12****89');
    expect(JSON.stringify(id)).not.toContain('P123456789');
    expect(id.frontAttachmentId).toBe(55);
    expect(id.backAttachmentId).toBe(56);
  });

  it('prefers document_number_masked over full document_number', () => {
    const id = normalizeGuardianIdentityForDisplay({
      document_type: 'national_id',
      document_number: 'SHOULD-NOT-LEAK',
      document_number_masked: 'XX****99',
    });
    expect(id.documentNumberMasked).toBe('XX****99');
    expect(Object.keys(id)).not.toContain('documentNumber');
  });

  it('marks missing identity document calmly', () => {
    const id = normalizeGuardianIdentityForDisplay(null);
    expect(id.hasDocument).toBe(false);
    expect(id.documentNumberMasked).toBeNull();
  });

  it('resolves secure attachment preview URLs via helper', () => {
    expect(resolveGuardianIdentityAttachmentPreviewUrl(42)).toBe(
      '/api/attachments/42/preview',
    );
    expect(resolveGuardianIdentityAttachmentPreviewUrl(null)).toBeNull();
    expect(resolveGuardianIdentityAttachmentPreviewUrl(0)).toBeNull();
  });

  it('maps linked_child_ids to child names', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [
        {
          name: 'Mom',
          is_primary_contact: true,
          applies_to_all_children: false,
          all_children: false,
          linked_child_ids: [10, 20],
        },
      ],
      children: [
        { id: 10, name: 'Ali' },
        { id: 20, name: 'Sara' },
      ],
    });
    expect(list[0].linkedChildLabels).toEqual(['Ali', 'Sara']);
    expect(list[0].hasUnresolvedLinkedChild).toBe(false);
  });

  it('handles unknown linked child without crashing', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [
        {
          name: 'Dad',
          is_primary_contact: true,
          applies_to_all_children: false,
          linked_child_ids: [999],
        },
      ],
      children: [{ id: 1, name: 'Known' }],
    });
    expect(list[0].hasUnresolvedLinkedChild).toBe(true);
    expect(list[0].linkedChildLabels).toEqual(['']);
  });

  it('supports family detail with two guardians', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [
        {
          name: 'أب',
          is_primary_contact: true,
          applies_to_all_children: true,
        },
        {
          name: 'أم',
          is_primary_contact: false,
          applies_to_all_children: false,
          linked_child_ids: [1],
        },
      ],
      children: [
        { id: 1, name: 'طفل 1' },
        { id: 2, name: 'طفل 2' },
      ],
    });
    expect(list).toHaveLength(2);
    expect(list[0].appliesToAllChildren).toBe(true);
    expect(list[1].linkedChildLabels).toEqual(['طفل 1']);
  });

  it('supports individual detail with multiple guardians', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [
        { name: 'G1', is_primary_contact: true },
        { name: 'G2', is_primary_contact: false },
        { name: 'G3', is_primary_contact: false },
      ],
    });
    expect(list).toHaveLength(3);
    expect(list.filter((g) => g.isPrimaryContact)).toHaveLength(1);
  });

  it('returns empty list when guardians null and no legacy', () => {
    expect(normalizeAdmissionGuardiansForDisplay({ guardians: null })).toEqual([]);
  });

  it('marks expired identity from expiry date', () => {
    const id = normalizeGuardianIdentityForDisplay(
      {
        document_type: 'national_id',
        document_number_masked: 'AB****',
        expiry_date: '2020-01-01',
      },
      { todayIso: '2026-07-11' },
    );
    expect(id.isExpired).toBe(true);
  });

  it('treats document_type alone as registered identity', () => {
    const id = normalizeGuardianIdentityForDisplay({
      document_type: 'passport',
    });
    expect(id.hasDocument).toBe(true);
    expect(id.documentType).toBe('passport');
  });

  it('shows textual identity without attachments as registered', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [
        {
          name: 'Dad',
          is_primary_contact: true,
          identity_document: {
            document_type: 'national_id',
            document_number_masked: 'MA****77',
            issue_date: '2022-01-01',
            expiry_date: '2032-01-01',
          },
        },
      ],
    });
    expect(list[0].identity.hasDocument).toBe(true);
    expect(list[0].identity.frontAttachmentId).toBeNull();
    expect(list[0].identity.backAttachmentId).toBeNull();
    expect(list[0].identity.documentNumberMasked).toBe('MA****77');
  });

  it('keeps second non-primary guardian with partial child link', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [
        { name: 'Primary', is_primary_contact: true, applies_to_all_children: true },
        {
          name: 'Secondary',
          is_primary_contact: false,
          applies_to_all_children: false,
          linked_child_ids: [5],
        },
      ],
      children: [{ id: 5, name: 'Only Child' }],
    });
    expect(list).toHaveLength(2);
    expect(list[1].name).toBe('Secondary');
    expect(list[1].linkedChildLabels).toEqual(['Only Child']);
  });

  it('dedupes only by guardian_id not by shared phone', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [
        {
          guardian_id: 1,
          name: 'Father',
          phone: '0600000000',
          is_primary_contact: true,
        },
        {
          guardian_id: 2,
          name: 'Mother',
          phone: '0600000000',
          is_primary_contact: false,
        },
      ],
    });
    expect(list).toHaveLength(2);
  });

  it('dedupes identical guardian_id', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [
        { guardian_id: 9, name: 'A', is_primary_contact: true },
        { guardian_id: 9, name: 'A copy', is_primary_contact: false },
      ],
    });
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('A');
  });

  it('preserves identity from raw through normalization', () => {
    const list = normalizeAdmissionGuardiansForDisplay({
      guardians: [
        {
          name: 'Mom',
          is_primary_contact: true,
          identity_document: {
            document_type: 'residence_card',
            document_number_masked: 'RC****01',
            verification_state: 'reviewed',
          },
        },
      ],
    });
    expect(list[0].identity.hasDocument).toBe(true);
    expect(list[0].identity.documentType).toBe('residence_card');
    expect(list[0].identity.verificationState).toBe('reviewed');
  });
});
