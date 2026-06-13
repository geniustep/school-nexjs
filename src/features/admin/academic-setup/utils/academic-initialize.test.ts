import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  aggregateInitializeResults,
  AUTO_SETUP_WIZARD_STEPS,
  buildAcademicInitializePayload,
  buildRetryInitializePayload,
  enabledLevelNeedsCompletion,
  filterWizardReferenceLevels,
  isIdempotentSuccessStatus,
  isLevelAlreadyEnabled,
  isLevelEnabled,
  isLevelSelectable,
  isQaTestLevelCode,
  levelSelectionStatusBadgeKey,
  mapTrackMappingPresentation,
  reconcileSelectedLevelIds,
  selectableInitializeLevelIds,
  trackIdsForInitializePayload,
  validateInitializeTrackSelections,
  wizardStepsForSelection,
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

  it('excludes enabled level ids from payload even when present in selection state', () => {
    const enabled = level({
      id: 5,
      code: 'P1',
      name: 'First primary',
      enabled: true,
      can_enable: false,
      link_status: 'enabled',
    });
    const payload = buildAcademicInitializePayload([4, 5], [normal, enabled], new Map(), {
      createFirstClasses: true,
      enableReferenceSubjects: true,
    });
    expect(payload.reference_level_ids).toEqual([4]);
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
  it('treats enabled levels as not selectable', () => {
    const enabled = level({
      id: 4,
      code: 'P2',
      name: 'P2',
      enabled: true,
      can_enable: false,
      link_status: 'enabled',
    });
    expect(isLevelSelectable(enabled)).toBe(false);
    expect(isLevelAlreadyEnabled(enabled)).toBe(true);
  });

  it('allows non-enabled level with can_enable', () => {
    const available = level({ id: 4, code: 'P2', name: 'P2', enabled: false, can_enable: true });
    expect(isLevelSelectable(available)).toBe(true);
  });

  it('blocks level when can_enable is false and not enabled', () => {
    const locked = level({
      id: 4,
      code: 'P2',
      name: 'P2',
      enabled: false,
      can_enable: false,
      link_status: 'legacy_ambiguous',
    });
    expect(isLevelSelectable(locked)).toBe(false);
  });

  it('select all helper ids ignore enabled levels', () => {
    const available = level({ id: 4, code: 'P2', name: 'P2', enabled: false, can_enable: true });
    const enabled = level({
      id: 5,
      code: 'P1',
      name: 'P1',
      enabled: true,
      can_enable: false,
      link_status: 'enabled',
    });
    const ids = selectableInitializeLevelIds([available, enabled]);
    expect(ids).toEqual([4]);
  });

  it('marks enabled levels with readiness gaps as needing completion', () => {
    const needsClass = level({
      id: 6,
      code: 'P3',
      name: 'P3',
      enabled: true,
      can_enable: false,
      link_status: 'enabled',
      readiness_status: 'needs_classes',
    });
    expect(enabledLevelNeedsCompletion(needsClass)).toBe(true);
    expect(levelSelectionStatusBadgeKey(needsClass)).toBe(
      'admin.academicSetup.autoSetup.statusEnabledNeedsCompletion',
    );
  });

  it('shows not enabled badge for complete enabled levels', () => {
    const complete = level({
      id: 7,
      code: 'P4',
      name: 'P4',
      enabled: true,
      can_enable: false,
      link_status: 'enabled',
      readiness_status: 'ready',
    });
    expect(levelSelectionStatusBadgeKey(complete)).toBe(
      'admin.academicSetup.autoSetup.statusAlreadyEnabled',
    );
  });

  it('ignores stale link_status when enabled is false', () => {
    const stale = level({
      id: 1,
      code: 'P1',
      name: 'P1',
      enabled: false,
      can_enable: true,
      link_status: 'enabled',
      school_level_id: 42,
    });
    expect(isLevelEnabled(stale)).toBe(false);
    expect(isLevelAlreadyEnabled(stale)).toBe(false);
    expect(isLevelSelectable(stale)).toBe(true);
    expect(levelSelectionStatusBadgeKey(stale)).toBe(
      'admin.academicSetup.guided.statusNotEnabled',
    );
  });

  it('keeps selectable when school_level_id is stale but enabled is false', () => {
    const stale = level({
      id: 2,
      code: 'P2',
      name: 'P2',
      enabled: false,
      can_enable: true,
      link_status: 'not_enabled',
      school_level_id: 99,
    });
    expect(isLevelSelectable(stale)).toBe(true);
  });

  it('reconcileSelectedLevelIds drops enabled, missing, and locked ids', () => {
    const enabled = level({
      id: 5,
      code: 'P3',
      name: 'P3',
      enabled: true,
      can_enable: false,
      link_status: 'enabled',
    });
    const available = level({ id: 4, code: 'P4', name: 'P4', enabled: false, can_enable: true });
    const locked = level({
      id: 6,
      code: 'P5',
      name: 'P5',
      enabled: false,
      can_enable: false,
    });
    const ids = reconcileSelectedLevelIds([available, enabled, locked], [4, 5, 6, 99]);
    expect(ids).toEqual([4]);
  });

  it('payload uses latest options only via reconcile', () => {
    const p1 = level({ id: 1, code: 'P1', name: 'P1', enabled: false, can_enable: true });
    const payload = buildAcademicInitializePayload([1, 2], [p1], new Map(), {
      createFirstClasses: true,
      enableReferenceSubjects: true,
    });
    expect(payload.reference_level_ids).toEqual([1]);
  });

  it('treats P1 P2 P3 as selectable after backend 82 reset shape', () => {
    const levels = [
      level({ id: 1, code: 'P1', name: 'P1', enabled: false, can_enable: true, link_status: 'not_enabled' }),
      level({ id: 2, code: 'P2', name: 'P2', enabled: false, can_enable: true, link_status: 'not_enabled' }),
      level({ id: 3, code: 'P3', name: 'P3', enabled: false, can_enable: true, link_status: 'not_enabled' }),
    ];
    expect(levels.every((item) => isLevelSelectable(item))).toBe(true);
    expect(levels.every((item) => !isLevelAlreadyEnabled(item))).toBe(true);
    expect(levels.map((item) => levelSelectionStatusBadgeKey(item))).toEqual([
      'admin.academicSetup.guided.statusNotEnabled',
      'admin.academicSetup.guided.statusNotEnabled',
      'admin.academicSetup.guided.statusNotEnabled',
    ]);
  });

  it('filters QA/TST levels out of wizard', () => {
    const qa = level({ id: 99, code: 'QA_TEST', name: 'QA' });
    expect(isQaTestLevelCode(qa.code)).toBe(true);
    expect(filterWizardReferenceLevels([qa]).length).toBe(0);
  });
});

describe('wizard stepper', () => {
  it('always exposes five fixed steps', () => {
    expect(wizardStepsForSelection()).toEqual(AUTO_SETUP_WIZARD_STEPS);
    expect(AUTO_SETUP_WIZARD_STEPS).toEqual([
      'levels',
      'tracks',
      'review',
      'execute',
      'complete',
    ]);
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
