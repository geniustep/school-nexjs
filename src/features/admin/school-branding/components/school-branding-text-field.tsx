'use client';

export function SchoolBrandingTextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  dir,
  autoComplete,
  placeholder,
  error,
  wide = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel' | 'url';
  dir?: 'rtl' | 'ltr' | 'auto';
  autoComplete?: string;
  placeholder?: string;
  error?: string;
  wide?: boolean;
}) {
  return (
    <div className={`school-branding-profile-field${wide ? ' school-branding-profile-field--wide' : ''}`}>
      <label className="school-branding-profile-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        dir={dir}
        autoComplete={autoComplete}
        className="school-branding-profile-field__input"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="school-branding-field-error">{error}</p> : null}
    </div>
  );
}
