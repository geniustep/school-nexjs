/** Odoo public school branding — GET /api/v1/public/school-branding */

export interface PublicSchoolBrandingData {
  school_code: string;
  school_name: string;
  logo_url: string | null;
  welcome_title: string;
  welcome_subtitle: string;
  academic_year_label: string;
  primary_color: string;
  /** Odoo secondary brand color (preferred for accent mapping). */
  secondary_color?: string;
  accent_color: string;
  logo_available?: boolean;
  fallback_brand: boolean;
}

export interface PublicSchoolBrandingMeta {
  resolved_by?: string;
  cache_ttl_seconds?: number;
  [key: string]: unknown;
}

/** Resolved branding passed from server page → login UI. */
export interface LoginSchoolBrandingView {
  schoolCode: string;
  /** When true, text fields come from API as-is (not translated). */
  fromApi: boolean;
  schoolName: string | null;
  welcomeSubtitle: string | null;
  academicYearLabel: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  logoAvailable: boolean;
}
