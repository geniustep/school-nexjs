import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api/client';
import {
  canEditStaffResponsibilityAssignment,
  canEndStaffResponsibilityAssignment,
  createStaffResponsibilityAssignment,
  endStaffResponsibilityAssignment,
  fetchStaffEffectivePermissionExplanation,
  fetchStaffResponsibilityAssignments,
  fetchStaffResponsibilityAssignmentsSummary,
  staffResponsibilityAssignmentEndpoints,
  updateStaffResponsibilityAssignment,
  type StaffResponsibilityAssignment,
} from '@/features/admin/staff/api/staff-responsibility-assignments-api';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

function assignment(overrides: Partial<StaffResponsibilityAssignment> = {}): StaffResponsibilityAssignment {
  return {
    id: 25,
    origin: 'legacy_header',
    scope_type: 'school',
    cycle_ids: [],
    level_ids: [],
    class_ids: [],
    capability_codes: ['view_students'],
    year_policy: 'follows_request_context',
    academic_year_id: null,
    active: true,
    state: 'active',
    effective_from: '2026-01-01',
    effective_to: null,
    is_effective: true,
    allowed_actions: { view: true, edit: false, end: false },
    ...overrides,
  };
}

describe('staff responsibility assignment API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds all routes from the canonical staff member endpoint', () => {
    expect(staffResponsibilityAssignmentEndpoints.collection(8151)).toBe(
      '/admin/staff/8151/responsibility-assignments',
    );
    expect(staffResponsibilityAssignmentEndpoints.item(8151, 91)).toBe(
      '/admin/staff/8151/responsibility-assignments/91',
    );
    expect(staffResponsibilityAssignmentEndpoints.end(8151, 91)).toBe(
      '/admin/staff/8151/responsibility-assignments/91/end',
    );
  });

  it('uses GET for list', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: { items: [], total: 0 }, meta: {} });
    await fetchStaffResponsibilityAssignments(8151);
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/staff/8151/responsibility-assignments');
  });

  it('reads assignments_summary from direct staff detail without recomputing it', async () => {
    mockedApi.get.mockResolvedValue({
      success: true,
      data: {
        id: 8151,
        assignments_summary: { total: 4, active: 3, manual_count: 2, legacy_header_count: 1 },
      },
      meta: {},
    });
    const response = await fetchStaffResponsibilityAssignmentsSummary(8151);
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/staff/8151');
    expect(response.success && response.data).toEqual({
      total: 4,
      active: 3,
      manual_count: 2,
      legacy_header_count: 1,
    });
  });

  it('reads assignments_summary from an item envelope', async () => {
    mockedApi.get.mockResolvedValue({
      success: true,
      data: {
        item: {
          id: 8151,
          assignments_summary: { total: 2, active: 1, manual_count: 0, legacy_header_count: 1 },
        },
      },
      meta: {},
    });
    const response = await fetchStaffResponsibilityAssignmentsSummary(8151);
    expect(response.success && response.data).toEqual({
      total: 2,
      active: 1,
      manual_count: 0,
      legacy_header_count: 1,
    });
  });

  it('keeps a missing summary nullable instead of inventing local counts', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: { id: 8151 }, meta: {} });
    const response = await fetchStaffResponsibilityAssignmentsSummary(8151);
    expect(response.success && response.data).toBeNull();
  });

  it('fetches effective permission explanation from the canonical endpoint', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: { capabilities: [] }, meta: {} });
    await fetchStaffEffectivePermissionExplanation(8151);
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/staff/8151/effective-permissions');
  });

  it('uses POST for create', async () => {
    mockedApi.post.mockResolvedValue({
      success: true,
      data: { item: assignment({ id: 91, origin: 'manual' }) },
      meta: {},
    });
    const payload = {
      scope_type: 'school' as const,
      capability_codes: ['view_exams'],
      year_policy: 'follows_request_context' as const,
    };
    await createStaffResponsibilityAssignment(8151, payload);
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/staff/8151/responsibility-assignments',
      payload,
    );
  });

  it('uses PATCH for update', async () => {
    mockedApi.patch.mockResolvedValue({
      success: true,
      data: { item: assignment({ id: 91, origin: 'manual' }) },
      meta: {},
    });
    const payload = { capability_codes: ['view_attendance'] };
    await updateStaffResponsibilityAssignment(8151, 91, payload);
    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/admin/staff/8151/responsibility-assignments/91',
      payload,
    );
  });

  it('uses POST /end and never models end as delete', async () => {
    mockedApi.post.mockResolvedValue({
      success: true,
      data: { item: assignment({ id: 91, origin: 'manual', active: false }) },
      meta: {},
    });
    await endStaffResponsibilityAssignment(8151, 91, { end_reason: 'test_end' });
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/staff/8151/responsibility-assignments/91/end',
      { end_reason: 'test_end' },
    );
  });

  it('keeps legacy_header read-only even if a malformed payload claims edit actions', () => {
    const legacy = assignment({ allowed_actions: { view: true, edit: true, end: true } });
    expect(canEditStaffResponsibilityAssignment(legacy)).toBe(false);
    expect(canEndStaffResponsibilityAssignment(legacy)).toBe(false);
  });

  it('allows active manual actions only when backend allowed_actions explicitly permits them', () => {
    const manual = assignment({
      id: 91,
      origin: 'manual',
      allowed_actions: { view: true, edit: true, end: true },
    });
    expect(canEditStaffResponsibilityAssignment(manual)).toBe(true);
    expect(canEndStaffResponsibilityAssignment(manual)).toBe(true);
    expect(canEditStaffResponsibilityAssignment({ ...manual, allowed_actions: { edit: false } })).toBe(false);
    expect(canEndStaffResponsibilityAssignment({ ...manual, allowed_actions: { end: false } })).toBe(false);
  });

  it('never offers patch or end for an ended manual assignment', () => {
    const ended = assignment({
      id: 91,
      origin: 'manual',
      active: false,
      state: 'cancelled',
      is_effective: false,
      allowed_actions: { view: true, edit: true, end: true },
    });
    expect(canEditStaffResponsibilityAssignment(ended)).toBe(false);
    expect(canEndStaffResponsibilityAssignment(ended)).toBe(false);
  });
});
