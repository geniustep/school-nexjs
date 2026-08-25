import { describe, expect, it } from 'vitest';
import { adminRequestControlsLocaleKeys, adminRequestControlsMessage } from './controls-i18n';

const LOCALES = ['ar', 'fr', 'en', 'es'] as const;

describe('admin request controls translations', () => {
  it('keeps the same control keys in all supported locales', () => {
    const expected = adminRequestControlsLocaleKeys('en').sort();
    for (const locale of LOCALES) {
      expect(adminRequestControlsLocaleKeys(locale).sort()).toEqual(expected);
    }
  });

  it('does not fall back to Arabic in LTR locales', () => {
    for (const locale of ['fr', 'en', 'es'] as const) {
      expect(adminRequestControlsMessage(locale, 'list.showClosed')).not.toMatch(/\p{Script=Arabic}/u);
      expect(adminRequestControlsMessage(locale, 'settings.serviceKindAppointment')).not.toMatch(/\p{Script=Arabic}/u);
    }
  });

  it('interpolates filtered result counts', () => {
    expect(adminRequestControlsMessage('en', 'list.filteredCount', { visible: 3, total: 8 }))
      .toBe('3 of 8 requests shown');
  });
});
