'use client';

import { useState } from 'react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { loginSchoolLogoBffPath } from '@/lib/public-school-branding/client';
import { cn } from '@/lib/utils/cn';
import type { LoginSchoolBrandingView } from '@/types/public-school-branding';

function schoolMonogram(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return 'S';
  const first = [...trimmed][0];
  return first ?? 'S';
}

export type LoginSchoolMarkPlacement = 'brand';

export function LoginSchoolMark({
  branding,
  schoolLabel,
  placement = 'brand',
}: {
  branding: LoginSchoolBrandingView;
  schoolLabel: string;
  placement?: LoginSchoolMarkPlacement;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = branding.logoAvailable && !logoFailed;

  if (showLogo) {
    return (
      <img
        src={loginSchoolLogoBffPath(branding.schoolCode)}
        alt={schoolLabel}
        className={cn('login-mark__logo', placement === 'brand' && 'login-mark__logo--brand')}
        decoding="async"
        onError={() => setLogoFailed(true)}
      />
    );
  }

  if (branding.fromApi) {
    return (
      <div className="login-mark__monogram login-mark__monogram--brand" aria-hidden="true">
        <span className="login-mark__monogram-glyph">{schoolMonogram(schoolLabel)}</span>
      </div>
    );
  }

  return <BrandLogo variant="full" className="login-mark__platform login-mark__platform--brand" />;
}
