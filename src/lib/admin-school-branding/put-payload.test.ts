import { describe, expect, it } from 'vitest';
import { buildOdooSchoolBrandingPutPayload } from '@/lib/admin-school-branding/put-payload';

describe('buildOdooSchoolBrandingPutPayload', () => {
  it('maps editable fields to Odoo snake_case', () => {
    const result = buildOdooSchoolBrandingPutPayload({
      welcomeSubtitle: 'مرحباً',
      primaryColor: '#1565C0',
      secondaryColor: '#E3F2FD',
      logoBase64: 'abc123',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toEqual({
      welcome_subtitle: 'مرحباً',
      primary_color: '#1565C0',
      secondary_color: '#E3F2FD',
      logo: 'abc123',
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
    const result = buildOdooSchoolBrandingPutPayload({
      welcomeSubtitle: 'Hello',
      primaryColor: '#111111',
      secondaryColor: '#222222',
      clearLogo: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.logo).toBeNull();
  });

  it('rejects forbidden fields in body keys', () => {
    const result = buildOdooSchoolBrandingPutPayload({
      school_name: 'Hack',
      welcomeSubtitle: 'Hello',
      primaryColor: '#111111',
      secondaryColor: '#222222',
    } as never);
    expect(result.ok).toBe(false);
  });
});
