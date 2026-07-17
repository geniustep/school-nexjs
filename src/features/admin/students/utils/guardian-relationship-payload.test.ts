import { describe, expect, it } from 'vitest';
import { bindActiveSchoolJsonBody } from '@/lib/api/bind-active-school-body';
import { shouldInjectActiveSchoolIdInBody } from '@/lib/api/bff-route-policy';
import { mapGuardianApiError } from './guardian-api-errors';
import {
  assertNoGuardianUpdateReadOnlyFields,
  pickGuardianRelationshipUpdateWriteFields,
  relationshipFormToLinkPersonPayload,
  relationshipFormToUpdatePayload,
  resolveSelectedRelationshipType,
} from './guardian-relationship-payload';
import type { RelationshipFormValues } from '../components/guardian-relationship-form';
import { DEFAULT_RELATIONSHIP_FORM } from '../components/guardian-relationship-form';

function form(partial: Partial<RelationshipFormValues> = {}): RelationshipFormValues {
  return {
    ...DEFAULT_RELATIONSHIP_FORM,
    date_start: '2026-07-17',
    notes: '',
    ...partial,
  };
}

describe('guardian link role payload', () => {
  it('sends technical mother value when mother is selected', () => {
    const payload = relationshipFormToLinkPersonPayload({ partner_id: 99 }, form({ relationship_type: 'mother' }));
    expect(payload.relationship_type).toBe('mother');
    expect(payload.partner_id).toBe(99);
    expect(payload).not.toHaveProperty('role');
  });

  it('sends technical father value when father is selected', () => {
    const payload = relationshipFormToLinkPersonPayload({ partner_id: 99 }, form({ relationship_type: 'father' }));
    expect(payload.relationship_type).toBe('father');
  });

  it('role switch father → mother before submit sends mother', () => {
    let values = form({ relationship_type: 'father' });
    values = { ...values, relationship_type: 'mother' };
    const payload = relationshipFormToLinkPersonPayload({ partner_id: 12 }, values);
    expect(payload.relationship_type).toBe('mother');
  });

  it('role switch mother → father before submit sends father', () => {
    let values = form({ relationship_type: 'mother' });
    values = { ...values, relationship_type: 'father' };
    const payload = relationshipFormToLinkPersonPayload({ partner_id: 12 }, values);
    expect(payload.relationship_type).toBe('father');
  });

  it('person metadata / prior father relationship does not override selected mother', () => {
    const personWithFatherMeta = {
      partner_id: 55,
      // display / search metadata that must never become the write role
      existing_roles: ['father'],
      role_labels: ['أب', 'Father'],
      relationship_type: 'father',
      role: 'father',
    };
    const payload = relationshipFormToLinkPersonPayload(
      personWithFatherMeta,
      form({ relationship_type: 'mother' }),
    );
    expect(payload.relationship_type).toBe('mother');
    expect(payload).not.toHaveProperty('existing_roles');
    expect(payload).not.toHaveProperty('role_labels');
    expect(payload).not.toHaveProperty('role');
  });

  it('translated labels are not accepted as relationship_type values', () => {
    expect(resolveSelectedRelationshipType('أم')).toBeNull();
    expect(resolveSelectedRelationshipType('Mère')).toBeNull();
    expect(resolveSelectedRelationshipType('mother')).toBe('mother');
  });

  it('never drops relationship_type from the link request', () => {
    const payload = relationshipFormToLinkPersonPayload(
      { partner_id: 7 },
      form({ relationship_type: 'legal_guardian' }),
    );
    expect(Object.prototype.hasOwnProperty.call(payload, 'relationship_type')).toBe(true);
    expect(payload.relationship_type).toBe('legal_guardian');
  });

  it('repeated submit uses the latest selected role, not a stale prior role', () => {
    const first = relationshipFormToLinkPersonPayload(
      { partner_id: 1 },
      form({ relationship_type: 'father' }),
    );
    const second = relationshipFormToLinkPersonPayload(
      { partner_id: 1 },
      form({ relationship_type: 'mother' }),
    );
    expect(first.relationship_type).toBe('father');
    expect(second.relationship_type).toBe('mother');
  });

  it('preserves real father singular-role conflict envelope in error mapping', () => {
    const mapped = mapGuardianApiError(
      {
        code: 'guardian_singular_role_conflict',
        message:
          'Student إسماعيل العمراني already has an active Father relationship with محمد احمد.',
        details: {
          student_id: 2081,
          role: 'father',
          existing_relationship_id: 3466,
          existing_partner_id: 12512,
          existing_guardian_id: 1744,
        },
      },
      (key) => key,
    );
    expect(mapped.message).toContain('Father relationship');
    expect(mapped.message).not.toBe('errors.serverError');
  });
});

describe('guardian relationship update allowlist payload', () => {
  it('excludes active_school_id present on the read model', () => {
    const readModel = {
      ...relationshipFormToUpdatePayload(form({ relationship_type: 'mother' })),
      active_school_id: 3,
      student_id: 6855,
      relationship_id: 3199,
      guardian_id: 400,
      partner_id: 500,
      guardian: { id: 400, name: 'X' },
      allowed_actions: { edit_relationship: true },
      role_labels: ['أم'],
    };
    const payload = pickGuardianRelationshipUpdateWriteFields(readModel);
    expect(payload).not.toHaveProperty('active_school_id');
    expect(assertNoGuardianUpdateReadOnlyFields(payload as Record<string, unknown>)).toEqual([]);
  });

  it('does not leak ids or computed display fields from the read model', () => {
    const payload = pickGuardianRelationshipUpdateWriteFields({
      relationship_type: 'mother',
      is_primary_contact: true,
      is_legal_guardian: false,
      student_id: 6855,
      guardian_id: 1,
      partner_id: 2,
      relationship_id: 3199,
      display_name: 'عرض',
      name: 'اسم',
      permissions: {},
      available_actions: [],
      person: { id: 9 },
      account: { user_id: 1 },
      created_at: '2020-01-01',
      state: 'active',
      active: true,
    });
    expect(payload).toEqual({
      relationship_type: 'mother',
      is_primary_contact: true,
      is_legal_guardian: false,
    });
  });

  it('sends only allowlisted writable fields from the form builder', () => {
    const payload = relationshipFormToUpdatePayload(
      form({
        relationship_type: 'mother',
        is_primary_contact: true,
        is_legal_guardian: false,
        is_financial_responsible: true,
        receives_notifications: false,
        is_emergency_contact: true,
        is_authorized_pickup: false,
        contact_priority: '2',
        date_start: '2026-01-01',
        notes: 'note',
      }),
    );
    expect(Object.keys(payload).sort()).toEqual(
      [
        'contact_priority',
        'date_start',
        'is_authorized_pickup',
        'is_emergency_contact',
        'is_financial_responsible',
        'is_legal_guardian',
        'is_primary_contact',
        'notes',
        'receives_notifications',
        'relationship_type',
      ].sort(),
    );
  });

  it('keeps boolean false on allowed flags', () => {
    const payload = relationshipFormToUpdatePayload(
      form({
        is_primary_contact: false,
        is_legal_guardian: false,
        receives_notifications: false,
        is_authorized_pickup: false,
      }),
    );
    expect(payload.is_primary_contact).toBe(false);
    expect(payload.receives_notifications).toBe(false);
    expect(payload.is_authorized_pickup).toBe(false);
  });

  it('omits empty optional notes/date per current contract (trim-empty skip)', () => {
    const payload = relationshipFormToUpdatePayload(
      form({ notes: '   ', date_start: '', contact_priority: '' }),
    );
    expect(payload).not.toHaveProperty('notes');
    expect(payload).not.toHaveProperty('date_start');
    expect(payload).not.toHaveProperty('contact_priority');
  });

  it('never sends nested person/guardian objects', () => {
    const payload = relationshipFormToUpdatePayload(form({ relationship_type: 'aunt' }));
    expect(payload).not.toHaveProperty('guardian');
    expect(payload).not.toHaveProperty('person');
  });

  it('proxy must not re-inject active_school_id onto guardian update bodies', () => {
    const path = '/admin/students/6855/guardians/3199/update';
    expect(shouldInjectActiveSchoolIdInBody(path)).toBe(false);
    const uiPayload = relationshipFormToUpdatePayload(form({ relationship_type: 'mother' }));
    const bound = bindActiveSchoolJsonBody(uiPayload, 3, {
      injectActiveSchoolId: shouldInjectActiveSchoolIdInBody(path),
    });
    expect(bound.ok).toBe(true);
    if (bound.ok) {
      expect(bound.body).not.toHaveProperty('active_school_id');
      expect(bound.body).toMatchObject({ relationship_type: 'mother' });
    }
  });

  it('preserves HTTP 422 validation envelope message for unsupported write fields', () => {
    const mapped = mapGuardianApiError(
      {
        code: 'validation_error',
        message: 'Unknown or unsupported write field: active_school_id',
        details: {},
      },
      (key) => key,
    );
    expect(mapped.message).toBe('Unknown or unsupported write field: active_school_id');
  });

  it('update URL identity stays outside the body (student/relationship ids not in payload)', () => {
    const payload = relationshipFormToUpdatePayload(form({ relationship_type: 'mother' }));
    expect(payload).not.toHaveProperty('student_id');
    expect(payload).not.toHaveProperty('relationship_id');
    expect(payload).not.toHaveProperty('guardian_id');
  });
});
