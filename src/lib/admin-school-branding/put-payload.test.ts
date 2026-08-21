import { describe, expect, it } from 'vitest';
import { buildOdooSchoolBrandingPutPayload } from '@/lib/admin-school-branding/put-payload';

describe('buildOdooSchoolBrandingPutPayload', () => {
  it('maps editable branding and school profile fields to Odoo snake_case', () => {
    const result = buildOdooSchoolBrandingPutPayload({
      welcomeSubtitle: 'مرحباً',
      primaryColor: '#1565C0',
      secondaryColor: '#E3F2FD',
      logoBase64: 'abc123',
      schoolNameAr: '  مدرسة رقيم  ',
      schoolNameLat: '  Raqeem School  ',
      schoolShortName: '  رقيم  ',
      street: '  12 شارع المدرسة  ',
      city: '  طنجة  ',
      phone: '  +212500000000  ',
      email: '  school@example.com  ',
      website: '  https://school.example.com  ',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toEqual({
      welcome_subtitle: 'مرحباً',
      primary_color: '#1565C0',
      secondary_color: '#E3F2FD',
      logo: 'abc123',
      school_name_ar: 'مدرسة رقيم',
      school_name_lat: 'Raqeem School',
      school_short_name: 'رقيم',
      street: '12 شارع المدرسة',
      city: 'طنجة',
      phone: '+212500000000',
      email: 'school@example.com',
      website: 'https://school.example.com',
    });
  });

  it('allows clearing optional profile fields without touching legacy school_name', () => {
    const result = buildOdooSchoolBrandingPutPayload({
      schoolNameLat: '   ',
      schoolShortName: '',
      website: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toEqual({
      school_name_lat: '',
      school_short_name: '',
      website: null,
    });
  });

  it('rejects invalid hex colors', () => {
    const result = buildOdooSchoolBrandingPutPayload({
      welcomeSubtitle: 'Hello',
      primaryColor: '1565C0',
      secondaryColor: '#E3F2FD',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe('primary_color');
  });

  it('sends logo null when clearLogo is true', () => {
    const result = buildOdooSchoolBrandingPutPayload({ clearLogo: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.logo).toBeNull();
  });

  it('rejects forbidden legacy identity fields in body keys', () => {
    const result = buildOdooSchoolBrandingPutPayload({
      school_name: 'Hack',
      schoolNameAr: 'مدرسة آمنة',
    } as never);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe('school_name');
  });

  it('rejects non-string optional profile values', () => {
    const result = buildOdooSchoolBrandingPutPayload({ email: 42 } as never);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe('email');
  });
});
