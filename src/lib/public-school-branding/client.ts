import type { CSSProperties } from 'react';
import type { LoginSchoolBrandingView } from '@/types/public-school-branding';

export function loginSchoolLogoBffPath(schoolCode: string): string {
  return `/api/public/school-branding/logo?school_code=${encodeURIComponent(schoolCode)}`;
}

export function loginBrandingStyle(branding: LoginSchoolBrandingView): CSSProperties | undefined {
  if (!branding.primaryColor && !branding.accentColor) return undefined;

  const style: Record<string, string> = {};
  if (branding.primaryColor) style['--login-brand-primary'] = branding.primaryColor;
  if (branding.accentColor) style['--login-brand-accent'] = branding.accentColor;
  return style as CSSProperties;
}

export function loginPageBranded(branding: LoginSchoolBrandingView): boolean {
  return !!(branding.primaryColor || branding.accentColor);
}
