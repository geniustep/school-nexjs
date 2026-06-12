import { describe, expect, it } from 'vitest';
import {
  formatLinkedTrackNames,
  formatUsageLines,
  levelRemoveDialogTitleKey,
  linkedItemsCta,
  nonZeroUsageTypes,
  primaryLinkedItemsRoute,
} from './level-linked-items';
import { translate } from '@/lib/i18n/messages';

const tAr = (key: string, params?: Record<string, string | number>) => translate('ar', key, params);

describe('level linked items', () => {
  it('does not treat supports_tracks as usage', () => {
    expect(nonZeroUsageTypes({ tracks: 0, classes: 0, subjects: 0 })).toEqual([]);
  });

  it('formats Arabic track usage without invalid plural', () => {
    const lines = formatUsageLines({ tracks: 1 }, tAr, 'ar');
    expect(lines).toHaveLength(1);
    expect(lines[0]?.label).toBe('شعبة واحدة');
    expect(lines[0]?.label).not.toContain('1 شعب');
  });

  it('routes single track usage to tracks tab with level_id', () => {
    expect(
      primaryLinkedItemsRoute(12, {
        tracks: 1,
        classes: 0,
        subjects: 0,
      }),
    ).toBe('/admin/settings/academic-setup/subjects?tab=tracks&level_id=12');
  });

  it('chooses track-specific CTA for one linked track', () => {
    const cta = linkedItemsCta(12, { tracks: 1, classes: 0, subjects: 0 });
    expect(cta?.labelKey).toBe('admin.academicSetup.guided.viewLinkedTrack');
  });

  it('chooses classes CTA when only classes are linked', () => {
    const cta = linkedItemsCta(12, { classes: 2, tracks: 0, subjects: 0 });
    expect(cta?.labelKey).toBe('admin.academicSetup.guided.viewLinkedClasses');
  });

  it('uses blocked title key when removal is blocked', () => {
    expect(levelRemoveDialogTitleKey('blocked')).toBe(
      'admin.academicSetup.guided.cannotRemoveLevelTitle',
    );
  });

  it('shows linked track names with overflow marker', () => {
    const presentation = formatLinkedTrackNames({
      tracks: [
        { id: 1, name: 'Sciences expérimentales' },
        { id: 2, name: 'Sciences mathématiques' },
        { id: 3, name: 'Lettres' },
        { id: 4, name: 'Économie' },
      ],
    });
    expect(presentation.items.map((track) => track.name)).toEqual([
      'Sciences expérimentales',
      'Sciences mathématiques',
      'Lettres',
    ]);
    expect(presentation.overflow).toBe(true);
  });
});
