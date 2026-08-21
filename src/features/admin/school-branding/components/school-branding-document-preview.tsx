'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { loginSchoolLogoBffPath } from '@/lib/public-school-branding/client';
import type { LoginSchoolBrandingView } from '@/types/public-school-branding';

function schoolMonogram(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return 'S';
  return [...trimmed][0] ?? 'S';
}

export function SchoolBrandingDocumentPreview({
  branding,
  nameAr,
  nameLat,
  shortName,
  street,
  city,
  phone,
  email,
  website,
  primaryColor,
  secondaryColor,
  logoPreviewUrl,
  logoCacheKey,
  clearLogo,
  sampleTitle,
}: {
  branding: LoginSchoolBrandingView;
  nameAr: string;
  nameLat: string;
  shortName: string;
  street: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  primaryColor: string;
  secondaryColor: string;
  logoPreviewUrl: string | null;
  logoCacheKey?: number;
  clearLogo: boolean;
  sampleTitle: string;
}) {
  const [remoteFailed, setRemoteFailed] = useState(false);
  const [localFailed, setLocalFailed] = useState(false);

  useEffect(() => {
    setRemoteFailed(false);
    setLocalFailed(false);
  }, [branding.schoolCode, branding.logoAvailable, logoPreviewUrl, clearLogo, logoCacheKey]);

  const displayName = nameAr.trim() || shortName.trim() || branding.schoolName || '—';
  const showRemoteLogo = branding.logoAvailable && !clearLogo && !logoPreviewUrl;
  const remoteSrc = showRemoteLogo && !remoteFailed
    ? `${loginSchoolLogoBffPath(branding.schoolCode)}${logoCacheKey ? `&v=${logoCacheKey}` : ''}`
    : null;
  const displaySrc = logoPreviewUrl ?? remoteSrc;
  const showImage = !!displaySrc && !localFailed;

  const locationLine = useMemo(
    () => [street.trim(), city.trim()].filter(Boolean).join(' · '),
    [street, city],
  );
  const contactLine = useMemo(
    () => [phone.trim(), email.trim(), website.trim()].filter(Boolean).join(' · '),
    [phone, email, website],
  );

  const style = {
    '--school-branding-document-primary': primaryColor || branding.primaryColor || undefined,
    '--school-branding-document-secondary': secondaryColor || branding.accentColor || undefined,
  } as CSSProperties;

  return (
    <div className="school-branding-document" style={style}>
      <div className="school-branding-document__header">
        <div className="school-branding-document__identity">
          <div className="school-branding-document__logo-wrap">
            {showImage ? (
              <img
                className="school-branding-document__logo"
                src={displaySrc}
                alt=""
                decoding="async"
                onError={() => {
                  if (logoPreviewUrl) setLocalFailed(true);
                  else setRemoteFailed(true);
                }}
              />
            ) : (
              <span className="school-branding-document__monogram" aria-hidden="true">
                {schoolMonogram(displayName)}
              </span>
            )}
          </div>
          <div className="school-branding-document__names">
            <strong className="school-branding-document__name-ar">{displayName}</strong>
            {nameLat.trim() ? (
              <span className="school-branding-document__name-lat" dir="ltr">
                {nameLat.trim()}
              </span>
            ) : null}
            {shortName.trim() && shortName.trim() !== displayName ? (
              <span className="school-branding-document__short-name">{shortName.trim()}</span>
            ) : null}
          </div>
        </div>

        <div className="school-branding-document__meta">
          {locationLine ? <span>{locationLine}</span> : null}
          {contactLine ? <span dir="auto">{contactLine}</span> : null}
        </div>
      </div>

      <div className="school-branding-document__rule" />
      <div className="school-branding-document__sample-title">{sampleTitle}</div>
      <div className="school-branding-document__sample-line school-branding-document__sample-line--wide" />
      <div className="school-branding-document__sample-line" />
    </div>
  );
}
