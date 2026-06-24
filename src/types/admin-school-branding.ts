/** Odoo admin school branding — GET/PUT /api/v1/admin/school-branding */

export type AdminSchoolBrandingSettingsSource = 'admin' | 'public_fallback';

export interface AdminSchoolBrandingOdooData {
  school_code: string;
  school_name: string;
  welcome_subtitle: string;
  academic_year_label: string;
  primary_color: string;
  secondary_color?: string;
  accent_color?: string;
  logo_available?: boolean;
  logo_url?: string | null;
  fallback_brand?: boolean;
}

export interface AdminSchoolBrandingPutPayload {
  welcome_subtitle?: string;
  primary_color?: string;
  secondary_color?: string;
  logo?: string | null | false;
}
