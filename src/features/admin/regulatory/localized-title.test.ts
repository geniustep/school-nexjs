import { describe, expect, it } from 'vitest';
import { localizedRegulatoryTitle } from './localized-title';

const item = {
  title: 'انطلاق السنة الدراسية 2026/2027',
  title_fr: 'Rentrée scolaire 2026/2027',
};

describe('localizedRegulatoryTitle', () => {
  it('keeps the canonical Arabic title for Arabic locale', () => {
    expect(localizedRegulatoryTitle(item, 'ar')).toBe(item.title);
  });

  it('uses the French title for fr and regional French locales', () => {
    expect(localizedRegulatoryTitle(item, 'fr')).toBe(item.title_fr);
    expect(localizedRegulatoryTitle(item, 'fr-MA')).toBe(item.title_fr);
    expect(localizedRegulatoryTitle(item, 'fr-FR')).toBe(item.title_fr);
  });

  it('falls back to the canonical title when title_fr is missing', () => {
    expect(localizedRegulatoryTitle({ title: item.title }, 'fr')).toBe(item.title);
    expect(localizedRegulatoryTitle({ title: item.title, title_fr: null }, 'fr')).toBe(item.title);
    expect(localizedRegulatoryTitle({ title: item.title, title_fr: '' }, 'fr')).toBe(item.title);
    expect(localizedRegulatoryTitle({ title: item.title, title_fr: '   ' }, 'fr')).toBe(item.title);
  });

  it('does not use the French title for non-French locales', () => {
    expect(localizedRegulatoryTitle(item, 'en')).toBe(item.title);
    expect(localizedRegulatoryTitle(item, 'es')).toBe(item.title);
  });
});
