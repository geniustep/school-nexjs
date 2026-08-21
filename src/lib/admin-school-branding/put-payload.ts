import type { AdminSchoolBrandingPutPayload } from '@/types/admin-school-branding';

export const SCHOOL_BRANDING_HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const FORBIDDEN_PUT_KEYS = new Set([
  'name',
  'school_name',
  'code',
  'school_code',
  'academic_year_label',
  'academic_year_id',
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
  schoolNameAr?: string | null;
  school_name_ar?: string | null;
  schoolNameLat?: string | null;
  school_name_lat?: string | null;
  schoolShortName?: string | null;
  school_short_name?: string | null;
  street?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
};

type BuildResult =
  | { ok: true; payload: AdminSchoolBrandingPutPayload }
  | { ok: false; code: string; field?: string };

function pickAliased<T extends object>(body: T, camelKey: keyof T, snakeKey: keyof T): unknown {
  if (Object.prototype.hasOwnProperty.call(body, camelKey)) return body[camelKey];
  return body[snakeKey];
}

function assignOptionalText(
  payload: AdminSchoolBrandingPutPayload,
  key: keyof Pick<
    AdminSchoolBrandingPutPayload,
    | 'school_name_ar'
    | 'school_name_lat'
    | 'school_short_name'
    | 'street'
    | 'city'
    | 'phone'
    | 'email'
    | 'website'
  >,
  value: unknown,
): BuildResult | null {
  if (value === undefined) return null;
  if (value === null) {
    payload[key] = null;
    return null;
  }
  if (typeof value !== 'string') {
    return { ok: false, code: 'validation_error', field: key };
  }
  payload[key] = value.trim();
  return null;
}

export function buildOdooSchoolBrandingPutPayload(
  body: SchoolBrandingClientPutBody,
): BuildResult {
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_PUT_KEYS.has(key)) {
      return { ok: false, code: 'forbidden_field', field: key };
    }
  }

  const payload: AdminSchoolBrandingPutPayload = {};
  const subtitle = body.welcomeSubtitle ?? body.welcome_subtitle;
  if (subtitle !== undefined) {
    if (typeof subtitle !== 'string') {
      return { ok: false, code: 'validation_error', field: 'welcome_subtitle' };
    }
    const trimmed = subtitle.trim();
    if (!trimmed) return { ok: false, code: 'validation_error', field: 'welcome_subtitle' };
    if (trimmed.length > 200) return { ok: false, code: 'validation_error', field: 'welcome_subtitle' };
    payload.welcome_subtitle = trimmed;
  }

  const primary = body.primaryColor ?? body.primary_color;
  if (primary !== undefined) {
    if (typeof primary !== 'string') {
      return { ok: false, code: 'validation_error', field: 'primary_color' };
    }
    const trimmed = primary.trim();
    if (!SCHOOL_BRANDING_HEX_COLOR.test(trimmed)) {
      return { ok: false, code: 'validation_error', field: 'primary_color' };
    }
    payload.primary_color = trimmed;
  }

  const secondary = body.secondaryColor ?? body.secondary_color;
  if (secondary !== undefined) {
    if (typeof secondary !== 'string') {
      return { ok: false, code: 'validation_error', field: 'secondary_color' };
    }
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

  const optionalFields: Array<[
    keyof Pick<
      AdminSchoolBrandingPutPayload,
      | 'school_name_ar'
      | 'school_name_lat'
      | 'school_short_name'
      | 'street'
      | 'city'
      | 'phone'
      | 'email'
      | 'website'
    >,
    unknown,
  ]> = [
    ['school_name_ar', pickAliased(body, 'schoolNameAr', 'school_name_ar')],
    ['school_name_lat', pickAliased(body, 'schoolNameLat', 'school_name_lat')],
    ['school_short_name', pickAliased(body, 'schoolShortName', 'school_short_name')],
    ['street', body.street],
    ['city', body.city],
    ['phone', body.phone],
    ['email', body.email],
    ['website', body.website],
  ];

  for (const [key, value] of optionalFields) {
    const error = assignOptionalText(payload, key, value);
    if (error) return error;
  }

  if (Object.keys(payload).length === 0) {
    return { ok: false, code: 'validation_error', field: 'payload' };
  }

  return { ok: true, payload };
}
