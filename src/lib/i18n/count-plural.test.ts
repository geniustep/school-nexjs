import { describe, expect, it } from 'vitest';
import { formatCountLabel, pluralForm } from '@/lib/i18n/count-plural';
import { translate } from '@/lib/i18n/messages';

const t = (key: string, params?: Record<string, string | number>) => translate('ar', key, params);

describe('count plural helper', () => {
  it('uses Arabic dual form for two tracks', () => {
    expect(pluralForm(2, 'ar')).toBe('two');
    expect(formatCountLabel(t, 'ar', 'track', 2)).toBe('شعبتان');
  });

  it('uses Arabic singular form for one class', () => {
    expect(formatCountLabel(t, 'ar', 'class', 1)).toBe('قسم واحد');
  });

  it('uses Arabic few form for three subjects', () => {
    expect(formatCountLabel(t, 'ar', 'subject', 3)).toBe('3 مواد');
  });

  it('uses linked track summary on level cards', () => {
    expect(formatCountLabel(t, 'ar', 'track', 1, 'linked')).toBe('شعبة واحدة مرتبطة');
  });

  it('uses English other form for multiple classes', () => {
    const en = (key: string, params?: Record<string, string | number>) => translate('en', key, params);
    expect(formatCountLabel(en, 'en', 'class', 3)).toBe('3 classes');
  });
});
