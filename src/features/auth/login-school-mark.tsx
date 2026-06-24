'use client';

import { useState } from 'react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { loginSchoolLogoBffPath } from '@/lib/public-school-branding/client';
import type { LoginSchoolBrandingView } from '@/types/public-school-branding';

function schoolMonogram(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return 'S';
  const first = [...trimmed][0];
  return first ?? 'S';
}

export function LoginSchoolMark({
  branding,
  schoolLabel,
  compact = false,
}: {
  branding: LoginSchoolBrandingView;
  schoolLabel: string;
  compact?: boolean;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = branding.logoAvailable && !logoFailed;

  if (showLogo) {
    return (
      <img
        src={loginSchoolLogoBffPath(branding.schoolCode)}
        alt={schoolLabel}
        className="login-welcome__logo login-welcome__logo--school"
        decoding="async"
        onError={() => setLogoFailed(true)}
      />
    );
  }

  if (branding.fromApi) {
    return (
      <div
        className={compact ? 'login-school-monogram login-school-monogram--compact' : 'login-school-monogram'}
        aria-hidden="true"
      >
        <span className="login-school-monogram__glyph">{schoolMonogram(schoolLabel)}</span>
      </div>
    );
  }

  return <BrandLogo variant={compact ? 'compact' : 'full'} className="login-welcome__logo" />;
}
