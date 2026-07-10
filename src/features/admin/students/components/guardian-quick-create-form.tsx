'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { IdentityDocumentFields } from '@/features/admin/parents/components/identity-document-fields';
import {
  emptyIdentityDocumentFormValues,
  validateIdentityDocumentForm,
  type IdentityDocumentFieldErrors,
  type IdentityDocumentFormValues,
} from '@/features/admin/parents/utils/identity-document';
import { mapGuardianApiError } from '../utils/guardian-api-errors';
import { buildGuardianQuickCreatePayload } from '../utils/guardian-quick-create-payload';
import { normalizeGuardianList, normalizeGuardianQuickCreateResponse } from '../utils/normalize-guardian';
import {
  formatMoroccanPhoneDisplay,
  moroccanPhoneSearchQuery,
  validateMoroccanPhone,
} from '../utils/normalize-moroccan-phone';
import { GuardianDuplicateAlert } from './guardian-duplicate-alert';
import type { GuardianDuplicateField, GuardianDuplicateMatch, GuardianSummary } from '@/types/student-360';
import './guardian-flow.css';

export interface GuardianCreateFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  secondaryPhone: string;
  email: string;
  address: string;
  city: string;
  identityDocument: IdentityDocumentFormValues;
}

export interface GuardianCreateFieldErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  secondaryPhone?: string;
  email?: string;
}

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
    <label className="guardian-create-field">
      <span className="tiny muted">{label}</span>
      {children}
      {hint ? <span className="tiny muted">{hint}</span> : null}
      {error ? (
        <span className="tiny guardian-create-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function buildFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}

function validateCreateForm(values: GuardianCreateFormValues, t: (k: string) => string): GuardianCreateFieldErrors {
  const errors: GuardianCreateFieldErrors = {};
  if (!values.firstName.trim()) errors.firstName = t('admin.student360.guardianFirstNameRequired');
  if (!values.lastName.trim()) errors.lastName = t('admin.student360.guardianLastNameRequired');
  if (!values.phone.trim()) {
    errors.phone = t('admin.student360.guardianPhoneRequired');
  } else if (!validateMoroccanPhone(values.phone)) {
    errors.phone = t('admin.student360.guardianPhoneInvalid');
  }
  if (values.secondaryPhone.trim()) {
    if (!validateMoroccanPhone(values.secondaryPhone)) {
      errors.secondaryPhone = t('admin.student360.guardianPhoneInvalid');
    } else if (
      moroccanPhoneSearchQuery(values.secondaryPhone) === moroccanPhoneSearchQuery(values.phone)
    ) {
      errors.secondaryPhone = t('admin.student360.guardianSecondaryPhoneSame');
    }
  }
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = t('admin.student360.errors.invalidEmail');
  }
  return errors;
}

function inferDuplicateFieldFromForm(values: GuardianCreateFormValues): GuardianDuplicateField {
  if (values.phone.trim()) return 'phone';
  if (values.email.trim()) return 'email';
  if (values.identityDocument.number.trim()) return 'national_id';
  return 'unknown';
}

export function GuardianQuickCreateForm({
  prefill,
  onCreated,
  onSelectExisting,
}: {
  prefill?: { query?: string };
  onCreated: (guardian: GuardianSummary) => void;
  onSelectExisting: (guardian: GuardianSummary) => void;
}) {
  const t = useT();
  const toast = useToast();
  const initialQuery = prefill?.query?.trim() ?? '';
  const prefillIsEmail = initialQuery.includes('@');
  const prefillIsPhone =
    !prefillIsEmail && /^[\d+\s().-]+$/.test(initialQuery) && initialQuery.replace(/\D/g, '').length >= 8;

  const [values, setValues] = useState<GuardianCreateFormValues>({
    firstName: prefillIsEmail || prefillIsPhone ? '' : initialQuery,
    lastName: '',
    phone: prefillIsPhone ? initialQuery : '',
    secondaryPhone: '',
    email: prefillIsEmail ? initialQuery : '',
    address: '',
    city: '',
    identityDocument: emptyIdentityDocumentFormValues(),
  });
  const [fieldErrors, setFieldErrors] = useState<GuardianCreateFieldErrors>({});
  const [identityErrors, setIdentityErrors] = useState<IdentityDocumentFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [duplicateField, setDuplicateField] = useState<GuardianDuplicateField | null>(null);
  const [matches, setMatches] = useState<GuardianDuplicateMatch[] | null>(null);
  const [duplicateLoadFailed, setDuplicateLoadFailed] = useState(false);

  function patch(partial: Partial<GuardianCreateFormValues>) {
    setValues((prev) => ({ ...prev, ...partial }));
    setFieldErrors({});
    setIdentityErrors({});
    setDuplicateField(null);
    setMatches(null);
    setDuplicateLoadFailed(false);
  }

  async function resolveDuplicateMatches(
    mapped: ReturnType<typeof mapGuardianApiError>,
    formValues: GuardianCreateFormValues,
  ): Promise<GuardianDuplicateMatch[]> {
    if (mapped.matches?.length) return mapped.matches;
    const q = formValues.phone.trim()
      ? moroccanPhoneSearchQuery(formValues.phone)
      : formValues.email.trim()
        ? formValues.email.trim().toLowerCase()
        : formValues.identityDocument.number.trim();
    if (!q) return [];
    const res = await api.get(endpoints.admin.guardiansSearch, { q, page: 1, page_size: 5 });
    if (res.success) return normalizeGuardianList(res.data);
    return [];
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateCreateForm(values, t);
    const nextIdentityErrors = validateIdentityDocumentForm(values.identityDocument, t);
    if (Object.keys(errors).length > 0 || Object.keys(nextIdentityErrors).length > 0) {
      setFieldErrors(errors);
      setIdentityErrors(nextIdentityErrors);
      toast.error(t('errors.validationFailed'));
      return;
    }

    setSaving(true);
    setDuplicateField(null);
    setMatches(null);
    setDuplicateLoadFailed(false);

    const payload = buildGuardianQuickCreatePayload(values);
    const res = await api.post<unknown>(endpoints.admin.guardiansQuickCreate, payload);
    setSaving(false);

    const guardian = res.success ? normalizeGuardianQuickCreateResponse(res.data) : null;
    if (guardian) {
      onCreated(guardian);
      return;
    }

    if (!res.success) {
      const mapped = mapGuardianApiError(res.error, t);
      if (mapped.duplicateField || mapped.matches?.length) {
        const resolved = await resolveDuplicateMatches(mapped, values);
        setDuplicateField(mapped.duplicateField ?? inferDuplicateFieldFromForm(values));
        setMatches(resolved);
        setDuplicateLoadFailed(resolved.length === 0);
        if (resolved.length === 0) {
          toast.error(t('admin.student360.guardianDuplicateLoadFailed'));
        }
      } else {
        toast.error(mapped.message);
      }
    }
  }

  const fullNamePreview = buildFullName(values.firstName, values.lastName);

  return (
    <form className="guardian-create-form" onSubmit={submit}>
      <fieldset className="guardian-create-form__section">
        <legend className="guardian-create-form__section-title">{t('admin.student360.guardianBasicInfo')}</legend>
        <div className="guardian-create-form__grid">
          <Field label={t('admin.student360.guardianFirstName')} error={fieldErrors.firstName}>
            <input
              className="input"
              value={values.firstName}
              onChange={(e) => patch({ firstName: e.target.value })}
              autoComplete="off"
            />
          </Field>
          <Field label={t('admin.student360.guardianLastName')} error={fieldErrors.lastName}>
            <input
              className="input"
              value={values.lastName}
              onChange={(e) => patch({ lastName: e.target.value })}
              autoComplete="off"
            />
          </Field>
        </div>
        {fullNamePreview ? (
          <p className="tiny muted">
            {t('admin.student360.create.fullNamePreview')}: <strong dir="auto">{fullNamePreview}</strong>
          </p>
        ) : null}
        <Field label={t('admin.phone')} error={fieldErrors.phone} hint={t('admin.student360.guardianPhoneHint')}>
          <input
            className="input"
            value={values.phone}
            onChange={(e) => patch({ phone: e.target.value })}
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
          />
          {values.phone.trim() ? (
            <span className="tiny muted" dir="ltr">
              {formatMoroccanPhoneDisplay(values.phone)}
            </span>
          ) : null}
        </Field>
      </fieldset>

      <details className="guardian-create-form__collapsible">
        <summary>{t('admin.student360.create.additionalInfo')}</summary>
        <div className="guardian-create-form__grid">
          <Field label={t('admin.student360.secondaryPhone')} error={fieldErrors.secondaryPhone}>
            <input
              className="input"
              value={values.secondaryPhone}
              onChange={(e) => patch({ secondaryPhone: e.target.value })}
              dir="ltr"
              inputMode="tel"
            />
          </Field>
          <Field label={t('admin.email')} error={fieldErrors.email}>
            <input
              className="input"
              type="email"
              value={values.email}
              onChange={(e) => patch({ email: e.target.value })}
              dir="ltr"
              autoComplete="email"
            />
          </Field>
          <Field label={t('admin.student360.address')}>
            <input className="input" value={values.address} onChange={(e) => patch({ address: e.target.value })} />
          </Field>
          <Field label={t('admin.student360.city')}>
            <input className="input" value={values.city} onChange={(e) => patch({ city: e.target.value })} />
          </Field>
        </div>
        <fieldset className="guardian-create-form__section">
          <legend className="guardian-create-form__section-title">
            {t('admin.identityDocument.sectionTitle')}
          </legend>
          <IdentityDocumentFields
            values={values.identityDocument}
            errors={identityErrors}
            onChange={(identityPatch) =>
              patch({
                identityDocument: { ...values.identityDocument, ...identityPatch },
              })
            }
          />
        </fieldset>
      </details>

      {duplicateField && matches && matches.length > 0 ? (
        <GuardianDuplicateAlert
          field={duplicateField}
          matches={matches}
          onLinkExisting={onSelectExisting}
          onEditInput={() => {
            setDuplicateField(null);
            setMatches(null);
          }}
        />
      ) : null}

      {duplicateLoadFailed ? (
        <p className="tiny guardian-create-field__error">{t('admin.student360.guardianDuplicateLoadFailed')}</p>
      ) : null}

      <div className="guardian-create-form__actions">
        <button type="submit" className="btn btn--primary" disabled={saving || !!(duplicateField && matches?.length)}>
          {saving ? t('admin.student360.creatingGuardian') : t('admin.student360.createAndContinueLink')}
        </button>
      </div>
    </form>
  );
}
