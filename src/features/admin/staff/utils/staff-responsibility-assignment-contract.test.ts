import { describe, expect, it } from 'vitest';
import type { StaffResponsibilityAssignment } from '@/features/admin/staff/api/staff-responsibility-assignments-api';
import {
  buildStaffResponsibilityWritePayload,
  classifyStaffResponsibilityError,
  emptyStaffResponsibilityForm,
  staffResponsibilityFormFromAssignment,
  toggleStaffResponsibilityNumber,
  toggleStaffResponsibilityString,
  validateStaffResponsibilityForm,
} from '@/features/admin/staff/utils/staff-responsibility-assignment-contract';

function baseAssignment(overrides: Partial<StaffResponsibilityAssignment> = {}): StaffResponsibilityAssignment {
  return {
    id: 9,
    origin: 'manual',
    scope_type: 'school',
    cycle_ids: [],
    level_ids: [],
    class_ids: [],
    capability_codes: ['view_attendance'],
    year_policy: 'follows_request_context',
    academic_year_id: null,
    active: true,
    state: 'active',
    effective_from: '2026-09-01',
    effective_to: '2027-06-30',
    is_effective: true,
    allowed_actions: { view: true, edit: true, end: true },
    ...overrides,
  };
}

describe('staff responsibility assignment UI write contract', () => {
  it('defaults create to school scope following the active academic context', () => {
    expect(emptyStaffResponsibilityForm()).toEqual({
      scopeType: 'school',
      cycleIds: [],
      levelIds: [],
      classIds: [],
      capabilityCodes: [],
      yearPolicy: 'follows_request_context',
      academicYearId: null,
      effectiveFrom: '',
      effectiveTo: '',
    });
  });

  it('builds school payload with every narrower scope cleared', () => {
    const form = {
      ...emptyStaffResponsibilityForm(),
      capabilityCodes: ['view_students'],
      cycleIds: [1],
      levelIds: [2],
      classIds: [3],
    };
    expect(buildStaffResponsibilityWritePayload(form)).toEqual({
      scope_type: 'school',
      cycle_ids: [],
      level_ids: [],
      class_ids: [],
      capability_codes: ['view_students'],
      year_policy: 'follows_request_context',
      academic_year_id: null,
      effective_from: null,
      effective_to: null,
    });
  });

  it('builds cycle payload without leaking levels/classes', () => {
    const form = {
      ...emptyStaffResponsibilityForm(),
      scopeType: 'cycle' as const,
      cycleIds: [4, 5],
      levelIds: [6],
      classIds: [7],
      capabilityCodes: ['view_attendance'],
    };
    const payload = buildStaffResponsibilityWritePayload(form);
    expect(payload.cycle_ids).toEqual([4, 5]);
    expect(payload.level_ids).toEqual([]);
    expect(payload.class_ids).toEqual([]);
  });

  it('builds levels payload without leaking cycle/classes', () => {
    const form = {
      ...emptyStaffResponsibilityForm(),
      scopeType: 'levels' as const,
      levelIds: [6, 7],
      capabilityCodes: ['view_exams'],
    };
    const payload = buildStaffResponsibilityWritePayload(form);
    expect(payload.cycle_ids).toEqual([]);
    expect(payload.level_ids).toEqual([6, 7]);
    expect(payload.class_ids).toEqual([]);
  });

  it('builds classes payload without leaking cycle/levels', () => {
    const form = {
      ...emptyStaffResponsibilityForm(),
      scopeType: 'classes' as const,
      classIds: [31, 32],
      capabilityCodes: ['view_attendance'],
    };
    const payload = buildStaffResponsibilityWritePayload(form);
    expect(payload.cycle_ids).toEqual([]);
    expect(payload.level_ids).toEqual([]);
    expect(payload.class_ids).toEqual([31, 32]);
  });

  it('requires at least one capability', () => {
    expect(validateStaffResponsibilityForm(emptyStaffResponsibilityForm())).toBe('capability_required');
  });

  it('requires cycle targets for cycle scope', () => {
    expect(validateStaffResponsibilityForm({
      ...emptyStaffResponsibilityForm(),
      scopeType: 'cycle',
      capabilityCodes: ['view_attendance'],
    })).toBe('scope_target_required');
  });

  it('requires level targets for levels scope', () => {
    expect(validateStaffResponsibilityForm({
      ...emptyStaffResponsibilityForm(),
      scopeType: 'levels',
      capabilityCodes: ['view_attendance'],
    })).toBe('scope_target_required');
  });

  it('requires class targets for classes scope', () => {
    expect(validateStaffResponsibilityForm({
      ...emptyStaffResponsibilityForm(),
      scopeType: 'classes',
      capabilityCodes: ['view_attendance'],
    })).toBe('scope_target_required');
  });

  it('requires academic year only for bound policy', () => {
    expect(validateStaffResponsibilityForm({
      ...emptyStaffResponsibilityForm(),
      capabilityCodes: ['view_attendance'],
      yearPolicy: 'bound',
    })).toBe('academic_year_required');
    expect(validateStaffResponsibilityForm({
      ...emptyStaffResponsibilityForm(),
      capabilityCodes: ['view_attendance'],
      yearPolicy: 'unbounded',
    })).toBeNull();
  });

  it('preserves bound academic_year_id', () => {
    const payload = buildStaffResponsibilityWritePayload({
      ...emptyStaffResponsibilityForm(),
      capabilityCodes: ['view_attendance'],
      yearPolicy: 'bound',
      academicYearId: 2026,
    });
    expect(payload.academic_year_id).toBe(2026);
  });

  it('strips academic_year_id for non-bound policy', () => {
    const payload = buildStaffResponsibilityWritePayload({
      ...emptyStaffResponsibilityForm(),
      capabilityCodes: ['view_attendance'],
      yearPolicy: 'unbounded',
      academicYearId: 2026,
    });
    expect(payload.academic_year_id).toBeNull();
  });

  it('rejects an end date before the start date before API mutation', () => {
    expect(validateStaffResponsibilityForm({
      ...emptyStaffResponsibilityForm(),
      capabilityCodes: ['view_attendance'],
      effectiveFrom: '2027-06-30',
      effectiveTo: '2026-09-01',
    })).toBe('effective_period_invalid');
  });

  it('keeps natural expiry as dates in payload with no state mutation field', () => {
    const payload = buildStaffResponsibilityWritePayload({
      ...emptyStaffResponsibilityForm(),
      capabilityCodes: ['view_attendance'],
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-02-01',
    });
    expect(payload.effective_to).toBe('2026-02-01');
    expect('state' in payload).toBe(false);
    expect('active' in payload).toBe(false);
  });

  it('never emits server-owned identity/provenance fields', () => {
    const payload = buildStaffResponsibilityWritePayload({
      ...emptyStaffResponsibilityForm(),
      capabilityCodes: ['view_students'],
    }) as Record<string, unknown>;
    for (const key of ['origin', 'scope_id', 'user_id', 'school_id', 'assigned_by']) {
      expect(key in payload).toBe(false);
    }
  });

  it('hydrates edit form from backend assignment without inventing scope', () => {
    const form = staffResponsibilityFormFromAssignment(baseAssignment({
      scope_type: 'classes',
      class_ids: [31, 32],
      year_policy: 'bound',
      academic_year_id: 77,
    }));
    expect(form.scopeType).toBe('classes');
    expect(form.classIds).toEqual([31, 32]);
    expect(form.yearPolicy).toBe('bound');
    expect(form.academicYearId).toBe(77);
  });

  it('toggles numeric scope ids without duplicates', () => {
    expect(toggleStaffResponsibilityNumber([1, 2], 2)).toEqual([1]);
    expect(toggleStaffResponsibilityNumber([1], 2)).toEqual([1, 2]);
  });

  it('toggles capability codes without duplicates', () => {
    expect(toggleStaffResponsibilityString(['a', 'b'], 'b')).toEqual(['a']);
    expect(toggleStaffResponsibilityString(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('maps legacy and cross-school validation codes without exposing backend detail', () => {
    expect(classifyStaffResponsibilityError('responsibility_assignment_legacy_read_only')).toBe('legacy_read_only');
    expect(classifyStaffResponsibilityError('responsibility_assignment_outside_school')).toBe('outside_school');
  });

  it('maps permission and not-found responses to safe user-facing classes', () => {
    expect(classifyStaffResponsibilityError('forbidden')).toBe('forbidden');
    expect(classifyStaffResponsibilityError('responsibility_assignment_not_found')).toBe('not_found');
  });

  it('maps year/date/end validation codes distinctly', () => {
    expect(classifyStaffResponsibilityError('responsibility_assignment_year_required')).toBe('year_required');
    expect(classifyStaffResponsibilityError('responsibility_assignment_year_conflict')).toBe('year_conflict');
    expect(classifyStaffResponsibilityError('responsibility_assignment_effective_period_invalid')).toBe('period_invalid');
    expect(classifyStaffResponsibilityError('responsibility_assignment_already_ended')).toBe('already_ended');
  });
});
