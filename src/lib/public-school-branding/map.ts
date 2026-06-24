import { sanitizeCssHexColor } from '@/lib/public-school-branding/colors';
import type { PublicSchoolBrandingData, LoginSchoolBrandingView } from '@/types/public-school-branding';

export function mapOdooBrandingToLoginView(
  data: PublicSchoolBrandingData,
): LoginSchoolBrandingView {
  const useApiText = !data.fallback_brand;

  return {
    schoolCode: data.school_code,
    fromApi: useApiText,
    schoolName: useApiText ? data.school_name : null,
    welcomeSubtitle: useApiText ? data.welcome_subtitle : null,
    academicYearLabel: useApiText ? data.academic_year_label : null,
    primaryColor: sanitizeCssHexColor(data.primary_color),
    accentColor:
      sanitizeCssHexColor(data.secondary_color) ?? sanitizeCssHexColor(data.accent_color),
    logoAvailable:
      !data.fallback_brand &&
      (data.logo_available === true || (data.logo_available !== false && !!data.logo_url)),
  };
}

export function fallbackLoginSchoolBrandingView(schoolCode: string): LoginSchoolBrandingView {
  return {
    schoolCode,
    fromApi: false,
    schoolName: null,
    welcomeSubtitle: null,
    academicYearLabel: null,
    primaryColor: null,
    accentColor: null,
    logoAvailable: false,
  };
}
