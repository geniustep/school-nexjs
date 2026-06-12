import { describe, expect, it } from 'vitest';
import { setupSectionHref } from './section-routes';

describe('subjects deep link integration', () => {
  it('builds tracks tab route with level_id query', () => {
    expect(
      setupSectionHref('tracks', { tab: 'tracks', level_id: 42 }),
    ).toBe('/admin/settings/academic-setup/subjects?tab=tracks&level_id=42');
  });

  it('builds classes route with level query', () => {
    expect(setupSectionHref('classes', { level: 42 })).toBe(
      '/admin/settings/academic-setup/classes?level=42',
    );
  });

  it('builds assignments route with level_id query', () => {
    expect(setupSectionHref('assignments', { level_id: 42 })).toBe(
      '/admin/settings/academic-setup/assignments?level_id=42',
    );
  });
});
