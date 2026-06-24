'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loginSchoolLogoBffPath } from '@/lib/public-school-branding/client';
import {
  SCHOOL_BRANDING_LOGO_ACCEPT,
  SCHOOL_BRANDING_LOGO_MAX_BYTES,
  SCHOOL_BRANDING_LOGO_MIME_TYPES,
} from '@/features/admin/school-branding/constants';
import { useT } from '@/features/i18n/locale-context';

function schoolMonogram(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return 'S';
  return [...trimmed][0] ?? 'S';
}

export function SchoolBrandingLogoField({
  schoolCode,
  schoolLabel,
  logoAvailable,
  logoCacheKey,
  previewUrl,
  clearLogo,
  onPreviewUrlChange,
  onPendingFileChange,
  onClearLogoChange,
  onError,
}: {
  schoolCode: string;
  schoolLabel: string;
  logoAvailable: boolean;
  logoCacheKey?: number;
  previewUrl: string | null;
  clearLogo: boolean;
  onPreviewUrlChange: (url: string | null) => void;
  onPendingFileChange: (file: File | null) => void;
  onClearLogoChange: (clear: boolean) => void;
  onError: (message: string | null) => void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [remoteFailed, setRemoteFailed] = useState(false);
  const [localFailed, setLocalFailed] = useState(false);

  const showRemoteLogo = logoAvailable && !clearLogo && !previewUrl;
  const remoteSrc = showRemoteLogo && !remoteFailed
    ? `${loginSchoolLogoBffPath(schoolCode)}${logoCacheKey ? `&v=${logoCacheKey}` : ''}`
    : null;
  const displaySrc = previewUrl ?? remoteSrc;
  const showImage = !!displaySrc && !localFailed;
  const showMonogram = !showImage;

  useEffect(() => {
    setRemoteFailed(false);
    setLocalFailed(false);
  }, [schoolCode, logoAvailable, previewUrl, clearLogo, logoCacheKey]);

  const handleFile = useCallback(
    (file: File | null) => {
      onError(null);
      setLocalFailed(false);

      if (!file) return;

      if (!SCHOOL_BRANDING_LOGO_MIME_TYPES.has(file.type)) {
        onError(t('admin.settings.schoolBranding.logo.invalidType'));
        return;
      }
      if (file.size > SCHOOL_BRANDING_LOGO_MAX_BYTES) {
        onError(t('admin.settings.schoolBranding.logo.tooLarge'));
        return;
      }

      onClearLogoChange(false);
      onPendingFileChange(file);
      const url = URL.createObjectURL(file);
      onPreviewUrlChange(url);
    },
    [onClearLogoChange, onError, onPendingFileChange, onPreviewUrlChange, t],
  );

  function clearLocalPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onPreviewUrlChange(null);
    onPendingFileChange(null);
    onError(null);
    setLocalFailed(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeServerLogo() {
    clearLocalPreview();
    onClearLogoChange(true);
  }

  return (
    <div className="school-branding-logo">
      <div className="school-branding-logo__preview" aria-hidden={showMonogram}>
        {showImage ? (
          <img
            src={displaySrc}
            alt=""
            decoding="async"
            onError={() => {
              if (previewUrl) {
                setLocalFailed(true);
                onError(t('admin.settings.schoolBranding.logo.loadFailed'));
              } else {
                setRemoteFailed(true);
              }
            }}
          />
        ) : (
          <span className="school-branding-logo__placeholder" aria-hidden="true">
            {schoolMonogram(schoolLabel)}
          </span>
        )}
      </div>

      <div className="school-branding-logo__actions">
        <input
          ref={inputRef}
          type="file"
          accept={SCHOOL_BRANDING_LOGO_ACCEPT}
          className="school-branding-logo__input"
          id="school-branding-logo-input"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <label htmlFor="school-branding-logo-input" className="btn btn--secondary btn--sm">
          {t('admin.settings.schoolBranding.logo.choose')}
        </label>
        {previewUrl ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearLocalPreview}>
            {t('admin.settings.schoolBranding.logo.clearPreview')}
          </button>
        ) : null}
        {logoAvailable && !clearLogo && !previewUrl ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={removeServerLogo}>
            {t('admin.settings.schoolBranding.logo.remove')}
          </button>
        ) : null}
        <p className="school-branding-logo__hint">{t('admin.settings.schoolBranding.logo.hint')}</p>
      </div>
    </div>
  );
}
