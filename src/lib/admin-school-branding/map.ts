import { mapOdooBrandingToLoginView } from '@/lib/public-school-branding/map';
import { sanitizeCssHexColor } from '@/lib/public-school-branding/colors';
import type { AdminSchoolBrandingOdooData } from '@/types/admin-school-branding';
import type { LoginSchoolBrandingView, PublicSchoolBrandingData } from '@/types/public-school-branding';

export function adminBrandingToPublicShape(data: AdminSchoolBrandingOdooData): PublicSchoolBrandingData {
  return {
    school_code: data.school_code,
    school_name: data.school_name,
    logo_url: data.logo_url ?? null,
    welcome_title: data.school_name,
    welcome_subtitle: data.welcome_subtitle,
    academic_year_label: data.academic_year_label,
    primary_color: data.primary_color,
    secondary_color: data.secondary_color,
    accent_color: data.secondary_color ?? data.accent_color ?? '',
    logo_available: data.logo_available,
    fallback_brand: data.fallback_brand ?? false,
  };
}

export function mapAdminSchoolBrandingToView(data: AdminSchoolBrandingOdooData): LoginSchoolBrandingView {
  return mapOdooBrandingToLoginView(adminBrandingToPublicShape(data));
}

export function extractAdminBrandingColors(data: AdminSchoolBrandingOdooData): {
  primaryColor: string | null;
  secondaryColor: string | null;
} {
  return {
    primaryColor: sanitizeCssHexColor(data.primary_color),
    secondaryColor:
      sanitizeCssHexColor(data.secondary_color) ?? sanitizeCssHexColor(data.accent_color),
  };
}
