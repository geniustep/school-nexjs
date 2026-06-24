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
  const previewColor = SCHOOL_BRANDING_HEX_COLOR.test(value.trim()) ? value.trim() : '#E5E7EB';

  return (
    <label className="school-branding-color col" style={{ gap: 4 }}>
      <span className="tiny muted">{label}</span>
      <div className="school-branding-color__row">
        <span
          className="school-branding-color__swatch"
          style={{ backgroundColor: previewColor }}
          aria-hidden="true"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('admin.settings.schoolBranding.colors.placeholder')}
          className="school-branding-color__input mono"
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
        />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </label>
  );
}
