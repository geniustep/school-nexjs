import type { AdminSchoolBrandingPutPayload } from '@/types/admin-school-branding';

export const SCHOOL_BRANDING_HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const FORBIDDEN_PUT_KEYS = new Set([
  'school_name',
  'school_code',
  'academic_year_label',
  'current_academic_year_id',
  'cover_image',
  'welcome_title',
]);

export type SchoolBrandingClientPutBody = {
  welcomeSubtitle?: string;
  welcome_subtitle?: string;
  primaryColor?: string;
  primary_color?: string;
  secondaryColor?: string;
  secondary_color?: string;
  logoBase64?: string | null;
  logo?: string | null;
  clearLogo?: boolean;
};

export function buildOdooSchoolBrandingPutPayload(
  body: SchoolBrandingClientPutBody,
): { ok: true; payload: AdminSchoolBrandingPutPayload } | { ok: false; code: string; field?: string } {
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_PUT_KEYS.has(key)) {
      return { ok: false, code: 'forbidden_field', field: key };
    }
  }

  const payload: AdminSchoolBrandingPutPayload = {};
  const subtitle = body.welcomeSubtitle ?? body.welcome_subtitle;
  if (subtitle !== undefined) {
    const trimmed = subtitle.trim();
    if (!trimmed) return { ok: false, code: 'validation_error', field: 'welcome_subtitle' };
    if (trimmed.length > 200) return { ok: false, code: 'validation_error', field: 'welcome_subtitle' };
    payload.welcome_subtitle = trimmed;
  }

  const primary = body.primaryColor ?? body.primary_color;
  if (primary !== undefined) {
    const trimmed = primary.trim();
    if (!SCHOOL_BRANDING_HEX_COLOR.test(trimmed)) {
      return { ok: false, code: 'validation_error', field: 'primary_color' };
    }
    payload.primary_color = trimmed;
  }

  const secondary = body.secondaryColor ?? body.secondary_color;
  if (secondary !== undefined) {
    const trimmed = secondary.trim();
    if (!SCHOOL_BRANDING_HEX_COLOR.test(trimmed)) {
      return { ok: false, code: 'validation_error', field: 'secondary_color' };
    }
    payload.secondary_color = trimmed;
  }

  if (body.clearLogo === true) {
    payload.logo = null;
  } else {
    const logo = body.logoBase64 ?? body.logo;
    if (logo !== undefined && logo !== null) {
      if (typeof logo !== 'string' || !logo.trim()) {
        return { ok: false, code: 'validation_error', field: 'logo' };
      }
      payload.logo = logo.trim();
    }
  }

  if (Object.keys(payload).length === 0) {
    return { ok: false, code: 'validation_error', field: 'payload' };
  }

  return { ok: true, payload };
}
