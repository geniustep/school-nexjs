import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  aggregateInitializeResults,
  buildAcademicInitializePayload,
  buildRetryInitializePayload,
  filterWizardReferenceLevels,
  isIdempotentSuccessStatus,
  isInitializeLevelSelectable,
  isQaTestLevelCode,
  mapTrackMappingPresentation,
  trackIdsForInitializePayload,
  validateInitializeTrackSelections,
  ASSIGNMENTS_CTA_HREF,
} from './academic-initialize';
import { isAcademicAutoSetupAvailable } from './academic-auto-setup-availability';
import { initializeAcademicSetup } from '../hooks/use-academic-initialize';
import type { ReferenceLevelOption } from '@/types/academic-levels';
import type { InitializeLevelResult } from '@/types/academic-initialize';

const postMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

vi.mock('@/lib/api/endpoints', () => ({
  endpoints: {
    admin: {
      setupAcademicInitialize: '/admin/setup/academic/initialize',
    },
  },
}));

function level(partial: Partial<ReferenceLevelOption> & Pick<ReferenceLevelOption, 'id' | 'code' | 'name'>): ReferenceLevelOption {
  return {
    sequence: 10,
    active: true,
    supports_tracks: false,
    enabled: false,
    can_enable: true,
    link_status: 'not_enabled',
    cycle: { id: 1, code: 'PRIMARY', name: 'Primary', sequence: 2 },
    reference_tracks: [],
    ...partial,
  };
}

describe('buildAcademicInitializePayload', () => {
  const normal = level({ id: 4, code: 'P2', name: 'Second primary' });
  const h1 = level({
    id: 12,
    code: 'H1',
    name: 'First bac',
    supports_tracks: true,
    reference_tracks: [
      {
        id: 31,
        code: 'H1_SCI_EXP',
        name: 'Sciences',
        sequence: 1,
        enabled: false,
        school_track_id: null,
        can_enable: true,
      },
      {
        id: 32,
        code: 'H1_MATH',
        name: 'Math',
        sequence: 2,
        enabled: false,
        school_track_id: null,
        can_enable: true,
      },
    ],
  });

  it('builds normal level payload with defaults true', () => {
    const payload = buildAcademicInitializePayload([4], [normal, h1], new Map(), {
      createFirstClasses: true,
      enableReferenceSubjects: true,
    });
    expect(payload).toEqual({
      reference_level_ids: [4],
      track_selections: {},
      create_first_classes: true,
      enable_reference_subjects: true,
    });
  });

  it('builds H1 payload with two selected tracks sorted', () => {
    const selections = new Map([[12, new Set([32, 31])]]);
    const payload = buildAcademicInitializePayload([12], [normal, h1], selections, {
      createFirstClasses: true,
      enableReferenceSubjects: true,
    });
    expect(payload.track_selections).toEqual({ '12': [31, 32] });
  });

  it('builds mixed normal + H1 payload', () => {
    const selections = new Map([[12, new Set([31])]]);
    const payload = buildAcademicInitializePayload([4, 12], [normal, h1], selections, {
      createFirstClasses: true,
      enableReferenceSubjects: true,
    });
    expect(payload.reference_level_ids).toEqual([4, 12]);
    expect(payload.track_selections).toEqual({ '12': [31] });
  });

  it('blocks H1 without track selection in validation', () => {
    const validation = validateInitializeTrackSelections([12], [h1], new Map());
    expect(validation.valid).toBe(false);
    expect(validation.invalidLevelIds).toEqual([12]);
  });

  it('does not send school_id or academic_year_id', () => {
    const payload = buildAcademicInitializePayload([4], [normal], new Map(), {
      createFirstClasses: true,
      enableReferenceSubjects: true,
    });
    expect(payload).not.toHaveProperty('school_id');
    expect(payload).not.toHaveProperty('academic_year_id');
  });

  it('defaults create_first_classes and enable_reference_subjects to true', () => {
    const payload = buildAcademicInitializePayload([4], [normal], new Map(), {
      createFirstClasses: true,
      enableReferenceSubjects: true,
    });
    expect(payload.create_first_classes).toBe(true);
    expect(payload.enable_reference_subjects).toBe(true);
  });
});

describe('track normalization', () => {
  const h1 = level({
    id: 12,
    code: 'H1',
    name: 'First bac',
    supports_tracks: true,
    reference_tracks: [
      {
        id: 32,
        code: 'H1_MATH',
        name: 'Math',
        sequence: 2,
        enabled: false,
        school_track_id: null,
        can_enable: true,
      },
      {
        id: 31,
        code: 'H1_SCI_EXP',
        name: 'Sciences',
        sequence: 1,
        enabled: false,
        school_track_id: null,
        can_enable: true,
        mapping_status: 'fully_mapped',
      },
    ],
  });

  it('sorts reference track ids in payload order', () => {
    const ids = trackIdsForInitializePayload(h1, new Map([[12, new Set([32, 31])]]));
    expect(ids).toEqual([31, 32]);
  });

  it('treats level_only_verified as valid presentation', () => {
    const mapped = mapTrackMappingPresentation('level_only_verified');
    expect(mapped?.key).toBe('admin.academicSetup.autoSetup.trackLevelOnly');
  });

  it('shows fully mapped track subjects presentation', () => {
    const mapped = mapTrackMappingPresentation('fully_mapped');
    expect(mapped?.key).toBe('admin.academicSetup.autoSetup.trackFullyMapped');
  });
});

describe('initialize selection rules', () => {
  it('allows already enabled level for idempotent review', () => {
    const enabled = level({ id: 4, code: 'P2', name: 'P2', enabled: true, can_enable: false, link_status: 'enabled' });
    expect(isInitializeLevelSelectable(enabled)).toBe(true);
  });

  it('filters QA/TST levels out of wizard', () => {
    const qa = level({ id: 99, code: 'QA_TEST', name: 'QA' });
    expect(isQaTestLevelCode(qa.code)).toBe(true);
    expect(filterWizardReferenceLevels([qa]).length).toBe(0);
  });
});

describe('aggregateInitializeResults', () => {
  it('marks partial failure grouped by level', () => {
    const results: InitializeLevelResult[] = [
      { reference_level_id: 4, status: 'enabled' },
      { reference_level_id: 12, status: 'failed', error: { code: 'partial_failure', message: 'x' } },
    ];
    const outcome = aggregateInitializeResults(results, {
      requested: 2,
      enabled: 1,
      already_enabled: 0,
      failed: 1,
      partial_failure: true,
    });
    expect(outcome.partialSuccess).toBe(true);
    expect(outcome.failedLevelIds).toEqual([12]);
  });

  it('treats already_enabled as non-error progress', () => {
    expect(isIdempotentSuccessStatus('already_enabled')).toBe(true);
    expect(isIdempotentSuccessStatus('subjects_already_enabled')).toBe(true);
  });
});

describe('initializeAcademicSetup POST', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({
      success: true,
      data: {
        results: [{ reference_level_id: 4, status: 'enabled' }],
        summary: { requested: 1, enabled: 1, already_enabled: 0, failed: 0 },
      },
    });
  });

  it('posts once to initialize endpoint', async () => {
    await initializeAcademicSetup(
      {
        reference_level_ids: [4],
        track_selections: {},
        create_first_classes: true,
        enable_reference_subjects: true,
      },
      3,
    );
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith(
      '/admin/setup/academic/initialize',
      {
        reference_level_ids: [4],
        track_selections: {},
        create_first_classes: true,
        enable_reference_subjects: true,
      },
      { active_school_id: 3 },
    );
  });
});

describe('buildRetryInitializePayload', () => {
  it('retries only failed level', () => {
    const h1 = level({
      id: 12,
      code: 'H1',
      name: 'H1',
      supports_tracks: true,
      reference_tracks: [
        {
          id: 31,
          code: 'H1_SCI',
          name: 'Sci',
          sequence: 1,
          enabled: false,
          school_track_id: null,
          can_enable: true,
        },
      ],
    });
    const payload = buildRetryInitializePayload(
      12,
      [h1],
      new Map([[12, new Set([31])]]),
      { createFirstClasses: true, enableReferenceSubjects: true },
    );
    expect(payload.reference_level_ids).toEqual([12]);
  });
});

describe('navigation constants', () => {
  it('links assignments CTA with assignment_missing filter', () => {
    expect(ASSIGNMENTS_CTA_HREF).toContain('assignment_missing');
    expect(ASSIGNMENTS_CTA_HREF).toContain('/admin/settings/academic-setup/assignments');
  });
});

describe('isAcademicAutoSetupAvailable', () => {
  const baseReadiness = {
    school: { id: 1, name: 'School' },
    scope: { type: 'full_school', is_full_school: true },
    readiness: {
      score: 0,
      status: 'blocked' as const,
      blocking_issues: 0,
      warnings: 0,
      information: 0,
      ready_for_timetable_setup: false,
    },
    domains: {},
    issues: [],
  };

  it('returns false when readiness lacks metadata (Production 77 behavior)', () => {
    expect(isAcademicAutoSetupAvailable(baseReadiness)).toBe(false);
  });

  it('returns true when readiness.features.academic_auto_setup is true', () => {
    expect(
      isAcademicAutoSetupAvailable({
        ...baseReadiness,
        features: { academic_auto_setup: true },
      }),
    ).toBe(true);
  });

  it('returns false when readiness.features.academic_auto_setup is false', () => {
    expect(
      isAcademicAutoSetupAvailable({
        ...baseReadiness,
        features: { academic_auto_setup: false },
      }),
    ).toBe(false);
  });

  it('returns true when setup_capabilities includes academic_auto_setup alias', () => {
    expect(
      isAcademicAutoSetupAvailable({
        ...baseReadiness,
        setup_capabilities: ['academic_auto_setup'],
      }),
    ).toBe(true);
  });

  it('ignores level options metadata (readiness-only contract)', () => {
    expect(
      isAcademicAutoSetupAvailable({
        ...baseReadiness,
        features: { academic_auto_setup: true },
      }),
    ).toBe(true);
  });

  it('does not enable wizard from dev flag outside local development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_ACADEMIC_AUTO_SETUP', '1');
    expect(isAcademicAutoSetupAvailable(baseReadiness)).toBe(false);
    vi.unstubAllEnvs();
  });

  it('allows local development override only in NODE_ENV=development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ACADEMIC_AUTO_SETUP', '1');
    expect(isAcademicAutoSetupAvailable(baseReadiness)).toBe(true);
    vi.unstubAllEnvs();
  });
});

describe('RBAC expectations', () => {
  it('school manager with manage_classes can access wizard route constants', async () => {
    const { canManageClasses } = await import('@/lib/permissions/academic-setup');
    expect(
      canManageClasses({
        id: 1,
        name: 'Mgr',
        email: 'm@test',
        role: 'admin',
        permissions: ['manage_classes'],
        admin_kind: 'school_manager',
        permissions_mode: 'full_school',
        school: { id: 1, name: 'School' },
      }),
    ).toBe(true);
  });

  it('admin_staff without manage_classes is blocked', async () => {
    const { canManageClasses } = await import('@/lib/permissions/academic-setup');
    expect(
      canManageClasses({
        id: 2,
        name: 'Staff',
        email: 's@test',
        role: 'admin',
        permissions: ['view_classes'],
        admin_kind: 'admin_staff',
        school: { id: 1, name: 'School' },
      }),
    ).toBe(false);
  });
});
