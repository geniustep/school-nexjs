import { describe, expect, it, vi, beforeEach } from 'vitest';
import { enableReferenceLevels, normalizeLevelOptionsPayload } from '../hooks/use-level-options';

const postMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

vi.mock('@/lib/api/endpoints', () => ({
  endpoints: {
    admin: {
      levelsEnable: '/admin/levels/enable',
    },
  },
}));

describe('normalizeLevelOptionsPayload reference_tracks', () => {
  it('parses and sorts reference_tracks by sequence then code', () => {
    const out = normalizeLevelOptionsPayload({
      reference_levels: [
        {
          id: 12,
          code: 'H1',
          name: 'الأولى باكالوريا',
          supports_tracks: true,
          reference_tracks: [
            { id: 2, code: 'H1_LIT', name: 'آداب', sequence: 20, enabled: false, school_track_id: null, can_enable: true },
            { id: 1, code: 'H1_SCI_EXP', name: 'علوم تجريبية', sequence: 10, enabled: false, school_track_id: null, can_enable: true },
          ],
        } as never,
      ],
      cycles: [],
      permissions: { can_enable: true },
    });
    expect(out?.reference_levels[0]?.reference_tracks?.map((t) => t.code)).toEqual([
      'H1_SCI_EXP',
      'H1_LIT',
    ]);
  });
});

describe('enableReferenceLevels payload', () => {
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

  it('sends normal level payload without track fields', async () => {
    await enableReferenceLevels(
      {
        reference_level_ids: [4],
        create_first_class: true,
        enable_reference_tracks: false,
        create_first_class_per_track: false,
        track_selections: {},
      },
      1,
    );
    expect(postMock).toHaveBeenCalledWith(
      '/admin/levels/enable',
      {
        reference_level_ids: [4],
        create_first_class: true,
        enable_reference_tracks: false,
        create_first_class_per_track: false,
        track_selections: {},
      },
      { active_school_id: 1 },
    );
  });

  it('sends mixed batch with track_selections keyed by reference level id', async () => {
    await enableReferenceLevels(
      {
        reference_level_ids: [4, 12],
        create_first_class: true,
        enable_reference_tracks: true,
        create_first_class_per_track: true,
        track_selections: { '12': [101, 102] },
      },
      1,
    );
    expect(postMock).toHaveBeenCalledWith(
      '/admin/levels/enable',
      {
        reference_level_ids: [4, 12],
        create_first_class: true,
        enable_reference_tracks: true,
        create_first_class_per_track: true,
        track_selections: { '12': [101, 102] },
      },
      { active_school_id: 1 },
    );
  });

  it('does not send school_id or academic_year_id', async () => {
    await enableReferenceLevels(
      {
        reference_level_ids: [4],
        create_first_class: false,
        enable_reference_tracks: false,
        create_first_class_per_track: false,
        track_selections: {},
      },
      1,
    );
    const body = postMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('school_id');
    expect(body).not.toHaveProperty('academic_year_id');
  });
});
