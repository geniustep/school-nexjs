'use client';

import { useRef } from 'react';
import { useT } from '@/features/i18n/locale-context';
import {
  DEFAULT_NATIONAL_ID_COUNTRY,
  identityDocumentTypeLabelKey,
  isIdentityDocumentCountryRequired,
  showsIdentityDocumentCountry,
  type IdentityDocumentFieldErrors,
  type IdentityDocumentFormValues,
} from '../utils/identity-document';
import { IDENTITY_DOCUMENT_TYPES, type IdentityDocumentType } from '@/types/identity-document';

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="identity-document-fields__field">
      <span className="tiny muted">{label}</span>
      {children}
      {hint ? <span className="tiny muted">{hint}</span> : null}
      {error ? (
        <span className="tiny identity-document-fields__error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function IdentityDocumentFields({
  values,
  errors,
  onChange,
  showClear = false,
  disabled = false,
}: {
  values: IdentityDocumentFormValues;
  errors?: IdentityDocumentFieldErrors;
  onChange: (patch: Partial<IdentityDocumentFormValues>) => void;
  showClear?: boolean;
  disabled?: boolean;
}) {
  const t = useT();
  const type = values.type;
  const showCountry = showsIdentityDocumentCountry(type);
  const countryRequired = isIdentityDocumentCountryRequired(type);
  const hasExisting =
    Boolean(values.type) || Boolean(values.number.trim()) || Boolean(values.country.trim());
  const snapshotRef = useRef<IdentityDocumentFormValues | null>(null);

  function patch(partial: Partial<IdentityDocumentFormValues>) {
    onChange({ ...partial, clear: false });
  }

  function handleTypeChange(nextType: IdentityDocumentType | '') {
    if (!nextType) {
      patch({ type: '', country: '' });
      return;
    }
    if (nextType === 'national_id') {
      patch({ type: nextType, country: DEFAULT_NATIONAL_ID_COUNTRY });
      return;
    }
    patch({
      type: nextType,
      country: nextType === values.type ? values.country : '',
    });
  }

  function handleClear() {
    snapshotRef.current = { ...values, clear: false };
    onChange({
      type: '',
      number: '',
      country: '',
      clear: true,
    });
  }

  function handleUndoClear() {
    const snapshot = snapshotRef.current;
    if (snapshot) {
      onChange({ ...snapshot, clear: false });
      snapshotRef.current = null;
      return;
    }
    onChange({ clear: false });
  }

  return (
    <div className="identity-document-fields">
      <p className="tiny muted identity-document-fields__help">
        {t('admin.identityDocument.optionalHelp')}
      </p>

      <div className="identity-document-fields__grid">
        <Field
          label={t('admin.identityDocument.type')}
          error={errors?.type}
          hint={type === 'national_id' ? t('admin.identityDocument.nationalIdHint') : undefined}
        >
          <select
            className="input"
            value={values.type}
            disabled={disabled || values.clear}
            onChange={(e) => handleTypeChange(e.target.value as IdentityDocumentType | '')}
          >
            <option value="">{t('admin.identityDocument.typeNone')}</option>
            {IDENTITY_DOCUMENT_TYPES.map((code) => (
              <option key={code} value={code}>
                {t(identityDocumentTypeLabelKey(code))}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('admin.identityDocument.number')} error={errors?.number}>
          <input
            className="input"
            value={values.number}
            disabled={disabled || values.clear}
            onChange={(e) => patch({ number: e.target.value })}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        {showCountry ? (
          <Field
            label={t('admin.identityDocument.country')}
            error={errors?.country}
            hint={
              countryRequired
                ? t('admin.identityDocument.countryRequiredHint')
                : t('admin.identityDocument.countryOptionalHint')
            }
          >
            <input
              className="input"
              value={values.country}
              disabled={disabled || values.clear}
              onChange={(e) => patch({ country: e.target.value.toUpperCase() })}
              dir="ltr"
              maxLength={2}
              placeholder="MA"
              autoComplete="off"
              spellCheck={false}
              aria-required={countryRequired || undefined}
            />
          </Field>
        ) : type === 'national_id' ? (
          <Field
            label={t('admin.identityDocument.country')}
            hint={t('admin.identityDocument.nationalIdCountryHint')}
          >
            <input
              className="input"
              value={DEFAULT_NATIONAL_ID_COUNTRY}
              disabled
              dir="ltr"
              readOnly
            />
          </Field>
        ) : null}
      </div>

      {showClear && hasExisting && !values.clear ? (
        <button
          type="button"
          className="btn btn--ghost btn--sm identity-document-fields__clear"
          disabled={disabled}
          onClick={handleClear}
        >
          {t('admin.identityDocument.clear')}
        </button>
      ) : null}

      {values.clear ? (
        <div className="identity-document-fields__clear-banner" role="status">
          <p className="tiny">{t('admin.identityDocument.clearPending')}</p>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={disabled}
            onClick={handleUndoClear}
          >
            {t('admin.identityDocument.undoClear')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
