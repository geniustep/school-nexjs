import { describe, expect, it } from 'vitest';
import { sanitizeCssHexColor } from '@/lib/public-school-branding/colors';
import { mapOdooBrandingToLoginView } from '@/lib/public-school-branding/map';

describe('sanitizeCssHexColor', () => {
  it('accepts #RRGGBB', () => {
    expect(sanitizeCssHexColor('#1565C0')).toBe('#1565C0');
  });

  it('expands #RGB', () => {
    expect(sanitizeCssHexColor('#abc')).toBe('#aabbcc');
  });

  it('rejects invalid values', () => {
    expect(sanitizeCssHexColor('1565C0')).toBeNull();
    expect(sanitizeCssHexColor('javascript:alert(1)')).toBeNull();
  });
});

describe('mapOdooBrandingToLoginView', () => {
  it('maps API branding with null logo', () => {
    const view = mapOdooBrandingToLoginView({
      school_code: 'raqeem',
      school_name: 'مدرسة رقيم التجريبية',
      logo_url: null,
      welcome_title: 'مدرسة رقيم التجريبية',
      welcome_subtitle: 'مرحباً بكم في بوابة المدرسة',
      academic_year_label: 'raqeem 2025-2026',
      primary_color: '#1565C0',
      accent_color: '#E3F2FD',
      fallback_brand: false,
    });

    expect(view.fromApi).toBe(true);
    expect(view.logoAvailable).toBe(false);
    expect(view.primaryColor).toBe('#1565C0');
    expect(view.schoolName).toBe('مدرسة رقيم التجريبية');
  });

  it('falls back to local text when fallback_brand=true', () => {
    const view = mapOdooBrandingToLoginView({
      school_code: 'raqeem',
      school_name: 'X',
      logo_url: '/ignored',
      welcome_title: 'X',
      welcome_subtitle: 'Y',
      academic_year_label: 'Z',
      primary_color: 'bad',
      accent_color: '#E3F2FD',
      fallback_brand: true,
    });

    expect(view.fromApi).toBe(false);
    expect(view.logoAvailable).toBe(false);
    expect(view.schoolName).toBeNull();
    expect(view.primaryColor).toBeNull();
    expect(view.accentColor).toBe('#E3F2FD');
  });
});
