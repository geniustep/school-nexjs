/** Odoo admin school branding — GET/PUT /api/v1/admin/school-branding */

export type AdminSchoolBrandingSettingsSource = 'admin' | 'public_fallback';

export interface AdminSchoolBrandingOdooData {
  school_code: string;
  school_name: string;
  school_name_ar?: string | null;
  school_name_lat?: string | null;
  school_short_name?: string | null;
  welcome_subtitle: string;
  academic_year_label: string;
  primary_color: string;
  secondary_color?: string;
  accent_color?: string;
  logo_available?: boolean;
  logo_url?: string | null;
  fallback_brand?: boolean;
  street?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

export interface AdminSchoolBrandingPutPayload {
  welcome_subtitle?: string;
  primary_color?: string;
  secondary_color?: string;
  logo?: string | null | false;
  school_name_ar?: string | null;
  school_name_lat?: string | null;
  school_short_name?: string | null;
  street?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}
