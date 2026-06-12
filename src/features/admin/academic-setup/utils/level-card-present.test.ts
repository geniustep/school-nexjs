import { describe, expect, it } from 'vitest';
import {
  buildLevelStatsSummary,
  levelCardEmptyHintKey,
  levelCardStatsInput,
} from './level-card-present';
import { resolveTracksCount } from './normalize-level';
import { translate } from '@/lib/i18n/messages';

const tAr = (key: string, params?: Record<string, string | number>) => translate('ar', key, params);

describe('level card presentation', () => {
  it('returns null tracks count when backend fields are missing', () => {
    expect(resolveTracksCount({ tracks_count: undefined, usage: undefined })).toBeNull();
  });

  it('uses tracks_count when provided by backend', () => {
    expect(resolveTracksCount({ tracks_count: 1, usage: undefined })).toBe(1);
  });

  it('shows linked track summary on card when tracks_count is positive', () => {
    const summary = buildLevelStatsSummary(tAr, 'ar', {
      classes: 0,
      students: 0,
      subjects: 0,
      tracks: 1,
    });
    expect(summary).toContain('شعبة واحدة مرتبطة');
    expect(summary).not.toContain('supports_tracks');
  });

  it('does not show tracks in card summary when tracks_count is zero', () => {
    const summary = buildLevelStatsSummary(tAr, 'ar', {
      classes: 0,
      students: 0,
      subjects: 0,
      tracks: 0,
    });
    expect(summary).not.toContain('شعبة');
  });

  it('uses alternate empty hint when tracks exist without classes', () => {
    expect(levelCardEmptyHintKey(1)).toBe('admin.academicSetup.levelNeedsClassesWithTracksHint');
    expect(levelCardEmptyHintKey(null)).toBe('admin.academicSetup.noClassesInLevel');
  });

  it('builds card stats from backend counts only', () => {
    const stats = levelCardStatsInput(
      {
        id: 1,
        name: 'P1',
        classes_count: 0,
        subjects_count: 0,
        tracks_count: 1,
        studentCount: 0,
      },
      0,
    );
    expect(stats.tracks).toBe(1);
    expect(stats.classes).toBe(0);
  });
});
