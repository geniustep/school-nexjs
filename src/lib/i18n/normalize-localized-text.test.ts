import { describe, expect, it } from 'vitest';
import { normalizeLocalizedText } from '@/lib/i18n/normalize-localized-text';

describe('normalizeLocalizedText', () => {
  it('returns plain strings unchanged', () => {
    expect(normalizeLocalizedText('توجد متأخرات', 'ar')).toBe('توجد متأخرات');
  });

  it('selects Arabic from localized object in ar locale', () => {
    expect(
      normalizeLocalizedText(
        {
          ar: 'توجد متأخرات',
          fr: 'Des impayés existent',
          en: 'Overdue balances exist',
        },
        'ar',
      ),
    ).toBe('توجد متأخرات');
  });

  it('selects French in fr locale', () => {
    expect(
      normalizeLocalizedText(
        {
          ar: 'توجد متأخرات',
          fr: 'Des impayés existent',
          en: 'Overdue balances exist',
        },
        'fr',
      ),
    ).toBe('Des impayés existent');
  });

  it('handles locale variants such as ar-MA and fr_FR', () => {
    const value = { ar: 'عربي', fr: 'Français', en: 'English' };
    expect(normalizeLocalizedText(value, 'ar-MA')).toBe('عربي');
    expect(normalizeLocalizedText(value, 'fr_FR')).toBe('Français');
  });

  it('falls back safely for malformed objects without producing [object Object]', () => {
    expect(normalizeLocalizedText({ count: 3 }, 'ar', { fallback: 'تنبيه' })).toBe('تنبيه');
    expect(normalizeLocalizedText({}, 'ar', { fallback: 'تنبيه' })).toBe('تنبيه');
    expect(String(normalizeLocalizedText({ ar: 1 }, 'ar'))).not.toContain('[object Object]');
  });
});
