'use client';

import { useState, type CSSProperties } from 'react';
import { loginSchoolLogoBffPath } from '@/lib/public-school-branding/client';
import type { LoginSchoolBrandingView } from '@/types/public-school-branding';

function schoolMonogram(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return 'S';
  return [...trimmed][0] ?? 'S';
}

export function SchoolBrandingPreview({
  branding,
  schoolLabel,
  welcomeSubtitle,
  primaryColor,
  secondaryColor,
  logoPreviewUrl,
  logoCacheKey,
  clearLogo,
}: {
  branding: LoginSchoolBrandingView;
  schoolLabel: string;
  welcomeSubtitle: string;
  primaryColor: string;
  secondaryColor: string;
  logoPreviewUrl: string | null;
  logoCacheKey?: number;
  clearLogo: boolean;
}) {
  const [remoteFailed, setRemoteFailed] = useState(false);
  const [localFailed, setLocalFailed] = useState(false);

  const showRemoteLogo = branding.logoAvailable && !clearLogo && !logoPreviewUrl;
  const remoteSrc = showRemoteLogo && !remoteFailed
    ? `${loginSchoolLogoBffPath(branding.schoolCode)}${logoCacheKey ? `&v=${logoCacheKey}` : ''}`
    : null;
  const displaySrc = logoPreviewUrl ?? remoteSrc;
  const showImage = !!displaySrc && !localFailed;

  const greeting = welcomeSubtitle.trim() || '—';
  const style = {
    '--school-branding-preview-primary': primaryColor || branding.primaryColor || undefined,
    '--school-branding-preview-secondary': secondaryColor || branding.accentColor || undefined,
  } as CSSProperties;

  return (
    <div className="school-branding-preview" style={style} aria-label={schoolLabel}>
      <div className="school-branding-preview__mark">
        {showImage ? (
          <img
            className="school-branding-preview__logo"
            src={displaySrc}
            alt=""
            decoding="async"
            onError={() => {
              if (logoPreviewUrl) setLocalFailed(true);
              else setRemoteFailed(true);
            }}
          />
        ) : (
          <div className="school-branding-preview__monogram" aria-hidden="true">
            {schoolMonogram(schoolLabel)}
          </div>
        )}
      </div>

      {branding.academicYearLabel ? (
        <span className="school-branding-preview__year">{branding.academicYearLabel}</span>
      ) : null}

      <h3 className="school-branding-preview__school">{schoolLabel}</h3>
      <p className="school-branding-preview__greeting">{greeting}</p>
    </div>
  );
}
