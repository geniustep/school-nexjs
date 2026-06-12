import { describe, expect, it } from 'vitest';
import type { EnableLevelResult, ReferenceLevelOption } from '@/types/academic-levels';
import { normalizeLevelOptionsPayload } from '../hooks/use-level-options';
import {
  aggregateEnableResults,
  buildEnableLevelsWithTracksPayload,
  buildEnableOutcomeSections,
  buildEnablePayload,
  buildEnableSummary,
  buildFirstClassRows,
  buildLevelEnableOutcomeLines,
  countSelectedTracks,
  filterReferenceLevels,
  groupReferenceLevelsByCycle,
  isLegacyUnlinkedLevel,
  isReferenceLevelSelectable,
  mapFirstClassSkippedReason,
  selectableIdsInCycle,
  selectableTrackIdsForLevel,
  sortReferenceTracks,
  sortReferenceLevels,
  validateTrackSelections,
} from './level-options';

const cyclePrimary = { id: 2, code: 'primary', name: 'Primary', sequence: 20 };
const cyclePreschool = { id: 1, code: 'preschool', name: 'Preschool', sequence: 10 };

function refLevel(
  partial: Partial<ReferenceLevelOption> & Pick<ReferenceLevelOption, 'id' | 'code'>,
): ReferenceLevelOption {
  return {
    name: partial.code,
    display_name: partial.code,
    sequence: partial.id * 10,
    active: true,
    supports_tracks: false,
    cycle: cyclePrimary,
    enabled: false,
    can_enable: true,
    link_status: 'not_enabled',
    ...partial,
  };
}

describe('normalizeLevelOptionsPayload', () => {
  it('returns null when data missing', () => {
    expect(normalizeLevelOptionsPayload(null)).toBeNull();
    expect(normalizeLevelOptionsPayload(undefined)).toBeNull();
  });

  it('normalizes partial payloads', () => {
    const out = normalizeLevelOptionsPayload({
      reference_levels: [{ id: 1 } as never],
      cycles: [],
      permissions: { can_enable: true },
    });
    expect(out?.reference_levels).toHaveLength(1);
    expect(out?.permissions.can_enable).toBe(true);
  });
});

describe('level-options utils', () => {
  const levels: ReferenceLevelOption[] = [
    refLevel({ id: 2, code: 'P2', cycle: cyclePrimary, sequence: 20 }),
    refLevel({ id: 1, code: 'P1', cycle: cyclePrimary, sequence: 10 }),
    refLevel({ id: 3, code: 'PRE1', cycle: cyclePreschool, sequence: 10 }),
  ];

  it('sorts by cycle then sequence', () => {
    const sorted = sortReferenceLevels(levels);
    expect(sorted.map((l) => l.code)).toEqual(['PRE1', 'P1', 'P2']);
  });

  it('groups by cycle order from cycles list', () => {
    const groups = groupReferenceLevelsByCycle(levels, [cyclePreschool, cyclePrimary]);
    expect(groups.map((g) => g.cycle.code)).toEqual(['preschool', 'primary']);
    expect(groups[1]?.levels.map((l) => l.code)).toEqual(['P1', 'P2']);
  });

  it('filters search and enabled mode', () => {
    const withEnabled = [
      ...levels,
      refLevel({ id: 4, code: 'P3', enabled: true, can_enable: false }),
    ];
    expect(
      filterReferenceLevels(withEnabled, { search: 'p2', mode: 'available' }).map((l) => l.code),
    ).toEqual(['P2']);
    expect(filterReferenceLevels(withEnabled, { mode: 'enabled' })).toHaveLength(1);
  });

  it('excludes enabled from enable payload', () => {
    const list = [
      refLevel({ id: 1, code: 'P1' }),
      refLevel({ id: 2, code: 'P2', enabled: true, can_enable: false }),
    ];
    expect(buildEnablePayload([1, 2], list)).toEqual([1]);
  });

  it('aggregates enable results', () => {
    const results: EnableLevelResult[] = [
      {
        reference_level_id: 1,
        status: 'enabled',
        school_level: { id: 50, name: 'P1', code: 'P1', supports_tracks: false },
      },
      { reference_level_id: 2, status: 'already_enabled' },
      {
        reference_level_id: 3,
        status: 'failed',
        error: { code: 'reference_level_inactive', message: 'inactive' },
      },
    ];
    const outcome = aggregateEnableResults(results);
    expect(outcome.enabledCount).toBe(1);
    expect(outcome.alreadyEnabledCount).toBe(1);
    expect(outcome.failedCount).toBe(1);
    expect(outcome.partialSuccess).toBe(true);
    expect(outcome.newSchoolLevelIds).toEqual([50]);
  });

  it('selectableIdsInCycle skips enabled levels', () => {
    const list = [
      refLevel({ id: 1, code: 'P1', cycle: cyclePrimary }),
      refLevel({ id: 2, code: 'P2', cycle: cyclePrimary, enabled: true, can_enable: false }),
    ];
    expect(selectableIdsInCycle(list, cyclePrimary.id)).toEqual([1]);
    expect(isReferenceLevelSelectable(list[1]!)).toBe(false);
  });

  it('blocks legacy unlinked levels from enable selection', () => {
    const p1 = refLevel({
      id: 1,
      code: 'P1',
      link_status: 'legacy_unlinked',
      can_enable: false,
      school_level_id: 77,
    });
    expect(isLegacyUnlinkedLevel(p1)).toBe(true);
    expect(isReferenceLevelSelectable(p1)).toBe(false);
    expect(buildEnablePayload([1, 2], [p1, refLevel({ id: 2, code: 'P3' })])).toEqual([2]);
    expect(selectableIdsInCycle([p1, refLevel({ id: 2, code: 'P3' })], cyclePrimary.id)).toEqual([2]);
  });

  it('counts linked_existing as enabled in aggregate', () => {
    const outcome = aggregateEnableResults([
      {
        reference_level_id: 4,
        status: 'linked_existing',
        school_level: { id: 77, name: 'P1', code: 'P1', supports_tracks: false },
      },
    ]);
    expect(outcome.enabledCount).toBe(1);
    expect(outcome.newSchoolLevelIds).toEqual([77]);
  });

  it('builds enable summary with class failure counts', () => {
    const summary = buildEnableSummary(
      [
        {
          reference_level_id: 1,
          status: 'enabled',
          first_class: { status: 'created', name: 'P2A' },
        },
        {
          reference_level_id: 2,
          status: 'enabled',
          first_class: { status: 'failed' },
        },
        {
          reference_level_id: 3,
          status: 'enabled',
          first_class: { status: 'already_exists' },
        },
      ],
      3,
    );
    expect(summary.classes_created).toBe(1);
    expect(summary.classes_failed).toBe(1);
    expect(summary.classes_already_exist).toBe(1);
  });

  it('builds outcome lines from backend first_class names only', () => {
    const ref = refLevel({ id: 4, code: 'P2', name: 'الثانية ابتدائي' });
    const lines = buildLevelEnableOutcomeLines(
      [
        {
          reference_level_id: 4,
          status: 'enabled',
          school_level: { id: 140, name: 'الثانية ابتدائي', code: 'P2', supports_tracks: false },
          first_class: { status: 'created', id: 51, name: 'P2A', code: '2025-P2-P2A' },
        },
        {
          reference_level_id: 5,
          status: 'enabled',
          school_level_id: 141,
          first_class: { status: 'failed' },
        },
      ],
      [ref],
      true,
    );
    expect(lines[0]?.messageKey).toBe('admin.academicSetup.guided.enableLevelOutcomeCreated');
    expect(lines[0]?.messageVars?.className).toBe('P2A');
    expect(lines[1]?.canCreateClass).toBe(true);
    expect(lines[1]?.schoolLevelId).toBe(141);
  });

  it('maps skipped first class reasons to i18n keys', () => {
    expect(mapFirstClassSkippedReason('level_already_enabled')).toBe(
      'admin.academicSetup.guided.firstClassSkippedAlreadyEnabled',
    );
    expect(mapFirstClassSkippedReason('create_first_class_disabled')).toBe(
      'admin.academicSetup.guided.firstClassSkippedNoOption',
    );
    expect(mapFirstClassSkippedReason('track_not_selected')).toBe(
      'admin.academicSetup.guided.selectAtLeastOneTrack',
    );
  });
});

describe('reference track helpers', () => {
  function h1Level(tracks: ReferenceLevelOption['reference_tracks']): ReferenceLevelOption {
    return refLevel({
      id: 12,
      code: 'H1',
      name: 'الأولى باكالوريا',
      supports_tracks: true,
      reference_tracks: tracks,
    });
  }

  it('sorts tracks by sequence then code', () => {
    const sorted = sortReferenceTracks([
      { id: 2, code: 'H1_B', name: 'B', sequence: 20, enabled: false, school_track_id: null, can_enable: true },
      { id: 1, code: 'H1_A', name: 'A', sequence: 10, enabled: false, school_track_id: null, can_enable: true },
    ]);
    expect(sorted.map((t) => t.code)).toEqual(['H1_A', 'H1_B']);
  });

  it('builds mixed payload with track ids only', () => {
    const h1 = h1Level([
      { id: 101, code: 'H1_SCI_EXP', name: 'علوم تجريبية', sequence: 10, enabled: false, school_track_id: null, can_enable: true },
      { id: 102, code: 'H1_SCI_MATH', name: 'علوم رياضية', sequence: 20, enabled: false, school_track_id: null, can_enable: true },
    ]);
    const p2 = refLevel({ id: 4, code: 'P2' });
    const payload = buildEnableLevelsWithTracksPayload(
      [4, 12],
      [p2, h1],
      new Map([[12, new Set([101])]]),
      { createFirstClass: true, createFirstClassPerTrack: true },
    );
    expect(payload.reference_level_ids).toEqual([4, 12]);
    expect(payload.create_first_class).toBe(true);
    expect(payload.enable_reference_tracks).toBe(true);
    expect(payload.create_first_class_per_track).toBe(true);
    expect(payload.track_selections).toEqual({ '12': [101] });
    expect(payload.track_selections['12']).not.toContain('علوم تجريبية' as never);
  });

  it('omits normal level from track_selections', () => {
    const payload = buildEnableLevelsWithTracksPayload(
      [4],
      [refLevel({ id: 4, code: 'P2' })],
      new Map(),
      { createFirstClass: true, createFirstClassPerTrack: false },
    );
    expect(payload.enable_reference_tracks).toBe(false);
    expect(payload.track_selections).toEqual({});
  });

  it('requires at least one selectable track for track levels', () => {
    const h1 = h1Level([
      { id: 101, code: 'H1_SCI_EXP', name: 'علوم تجريبية', sequence: 10, enabled: false, school_track_id: null, can_enable: true },
    ]);
    const result = validateTrackSelections(new Set([12]), [h1], new Map());
    expect(result.valid).toBe(false);
    expect(result.invalidLevelIds).toEqual([12]);
  });

  it('excludes enabled tracks from selectable ids', () => {
    const h1 = h1Level([
      { id: 101, code: 'H1_SCI_EXP', name: 'علوم تجريبية', sequence: 10, enabled: true, school_track_id: 55, can_enable: false },
      { id: 102, code: 'H1_SCI_MATH', name: 'علوم رياضية', sequence: 20, enabled: false, school_track_id: null, can_enable: true },
    ]);
    expect(selectableTrackIdsForLevel(h1)).toEqual([102]);
    expect(countSelectedTracks(h1, new Map([[12, new Set([101, 102])]]))).toEqual({
      selected: 1,
      total: 1,
    });
  });

  it('aggregates track and per-track class failures', () => {
    const outcome = aggregateEnableResults([
      {
        reference_level_id: 12,
        status: 'enabled',
        school_level_id: 200,
        tracks: [
          {
            reference_track_id: 101,
            status: 'enabled',
            school_track_id: 301,
            first_class: { status: 'created', name: 'H1-SCI-EXP-A' },
          },
          {
            reference_track_id: 102,
            status: 'failed',
          },
        ],
      },
    ]);
    expect(outcome.tracksEnabled).toBe(1);
    expect(outcome.tracksFailed).toBe(1);
    expect(outcome.classesCreated).toBe(1);
    expect(outcome.partialSuccess).toBe(true);
  });

  it('builds outcome sections with school_track_id CTA', () => {
    const h1 = h1Level([
      { id: 101, code: 'H1_SCI_EXP', name: 'العلوم التجريبية', sequence: 10, enabled: false, school_track_id: null, can_enable: true },
    ]);
    const sections = buildEnableOutcomeSections(
      [
        {
          reference_level_id: 12,
          status: 'enabled',
          school_level_id: 200,
          tracks: [
            {
              reference_track_id: 101,
              status: 'enabled',
              school_track_id: 301,
              first_class: { status: 'failed' },
            },
          ],
        },
      ],
      [h1],
      { createFirstClass: false, createFirstClassPerTrack: true },
    );
    expect(sections[0]?.tracks[0]?.canCreateClass).toBe(true);
    expect(sections[0]?.tracks[0]?.schoolTrackId).toBe(301);
    expect(sections[0]?.tracks[0]?.trackName).toBe('العلوم التجريبية');
  });
});
