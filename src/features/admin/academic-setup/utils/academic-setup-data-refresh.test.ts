import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { refreshAcademicSetupData } from './academic-setup-data-refresh';

describe('refreshAcademicSetupData', () => {
  it('reloads levels, options, classes, readiness, and tracks', () => {
    const levels = vi.fn();
    const levelOptions = vi.fn();
    const classes = vi.fn();
    const readiness = vi.fn();
    const tracks = vi.fn();

    refreshAcademicSetupData({
      levels,
      levelOptions,
      classes,
      readiness,
      tracks,
    });

    expect(levels).toHaveBeenCalledTimes(1);
    expect(levelOptions).toHaveBeenCalledTimes(1);
    expect(classes).toHaveBeenCalledTimes(1);
    expect(readiness).toHaveBeenCalledTimes(1);
    expect(tracks).toHaveBeenCalledTimes(1);
  });
});

describe('classes page invalidation', () => {
  it('refreshes level options after level removal handler', () => {
    const page = readFileSync(
      resolve('src/app/admin/settings/academic-setup/classes/page.tsx'),
      'utf8',
    );
    expect(page).toContain('refreshAcademicSetupData');
    expect(page).toContain('levelOptions: levelOptionsState.reload');
    expect(page).toContain('onLevelRemoved={refreshAll}');
  });
});
