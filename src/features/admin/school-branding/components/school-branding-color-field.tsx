'use client';

import { SCHOOL_BRANDING_HEX_COLOR } from '@/features/admin/school-branding/constants';
import { useT } from '@/features/i18n/locale-context';

export function SchoolBrandingColorField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const t = useT();
  const trimmed = value.trim();
  const previewColor = SCHOOL_BRANDING_HEX_COLOR.test(trimmed) ? trimmed : '#E5E7EB';

  return (
    <div className="school-branding-color">
      <span className="school-branding-color__label">{label}</span>
      <div className="school-branding-color__row">
        <div className="school-branding-color__picker-wrap">
          <input
            type="color"
            value={previewColor}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="school-branding-color__picker"
            aria-label={label}
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('admin.settings.schoolBranding.colors.placeholder')}
          className="school-branding-color__input"
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
        />
      </div>
      {error ? <p className="school-branding-field-error">{error}</p> : null}
    </div>
  );
}
