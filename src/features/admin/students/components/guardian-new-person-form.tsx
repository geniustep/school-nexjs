'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { IdentityDocumentFields } from '@/features/admin/parents/components/identity-document-fields';
import {
  emptyIdentityDocumentFormValues,
  validateIdentityDocumentForm,
  type IdentityDocumentFieldErrors,
  type IdentityDocumentFormValues,
} from '@/features/admin/parents/utils/identity-document';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import { searchGuardianCandidatesForStudent } from '../utils/guardian-candidate-search';
import {
  formatMoroccanPhoneDisplay,
  moroccanPhoneSearchQuery,
  validateMoroccanPhone,
} from '../utils/normalize-moroccan-phone';
import { GuardianDuplicateSuggestions } from './guardian-duplicate-suggestions';
import type { PersonSearchResult } from '@/types/student-360';

export interface NewPersonDraft {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  identityDocument: IdentityDocumentFormValues;
}

export interface NewPersonFieldErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

const MIN_DUPLICATE_QUERY = 2;

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

function buildDuplicateQuery(draft: NewPersonDraft): string {
  const phone = draft.phone.trim();
  if (phone) return moroccanPhoneSearchQuery(phone);
  const email = draft.email.trim();
  if (email) return email.toLowerCase();
  const identityNumber = draft.identityDocument.number.trim();
  if (identityNumber) return identityNumber;
  const name = buildFullName(draft.firstName, draft.lastName);
  return name.trim();
}

export function validateNewPersonDraft(
  draft: NewPersonDraft,
  t: (key: string) => string,
): NewPersonFieldErrors {
  const errors: NewPersonFieldErrors = {};
  if (!draft.firstName.trim()) errors.firstName = t('admin.student360.guardianFirstNameRequired');
  if (!draft.lastName.trim()) errors.lastName = t('admin.student360.guardianLastNameRequired');
  if (!draft.phone.trim()) {
    errors.phone = t('admin.student360.guardianPhoneRequired');
  } else if (!validateMoroccanPhone(draft.phone)) {
    errors.phone = t('admin.student360.guardianPhoneInvalid');
  }
  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    errors.email = t('admin.student360.errors.invalidEmail');
  }
  return errors;
}

export function GuardianNewPersonForm({
  studentId,
  prefill,
  onContinue,
  onUseExisting,
}: {
  studentId: number;
  prefill?: { query?: string };
  onContinue: (draft: NewPersonDraft) => void;
  onUseExisting: (person: PersonSearchResult) => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const initialQuery = prefill?.query?.trim() ?? '';
  const prefillIsEmail = initialQuery.includes('@');
  const prefillIsPhone =
    !prefillIsEmail && /^[\d+\s().-]+$/.test(initialQuery) && initialQuery.replace(/\D/g, '').length >= 8;

  const [draft, setDraft] = useState<NewPersonDraft>({
    firstName: prefillIsEmail || prefillIsPhone ? '' : initialQuery,
    lastName: '',
    phone: prefillIsPhone ? initialQuery : '',
    email: prefillIsEmail ? initialQuery : '',
    identityDocument: emptyIdentityDocumentFormValues(),
  });
  const [fieldErrors, setFieldErrors] = useState<NewPersonFieldErrors>({});
  const [identityErrors, setIdentityErrors] = useState<IdentityDocumentFieldErrors>({});
  const [duplicateCandidates, setDuplicateCandidates] = useState<PersonSearchResult[]>([]);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const duplicateQuery = useDebouncedValue(buildDuplicateQuery(draft), 400);
  const requestSeq = useRef(0);

  useEffect(() => {
    setDuplicateDismissed(false);
  }, [draft.firstName, draft.lastName, draft.phone, draft.email, draft.identityDocument.number]);

  useEffect(() => {
    if (duplicateQuery.length < MIN_DUPLICATE_QUERY) {
      setDuplicateCandidates([]);
      setDuplicateLoading(false);
      return;
    }

    const seq = ++requestSeq.current;
    setDuplicateLoading(true);

    searchGuardianCandidatesForStudent(studentId, {
      query: duplicateQuery,
      activeSchoolId,
    })
      .then((outcome) => {
        if (seq !== requestSeq.current) return;
        setDuplicateCandidates(outcome.ok ? outcome.results.slice(0, 3) : []);
      })
      .finally(() => {
        if (seq === requestSeq.current) setDuplicateLoading(false);
      });
  }, [duplicateQuery, studentId, activeSchoolId]);

  function patch(partial: Partial<NewPersonDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
    setFieldErrors({});
    setIdentityErrors({});
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateNewPersonDraft(draft, t);
    const nextIdentityErrors = validateIdentityDocumentForm(draft.identityDocument, t);
    if (Object.keys(errors).length > 0 || Object.keys(nextIdentityErrors).length > 0) {
      setFieldErrors(errors);
      setIdentityErrors(nextIdentityErrors);
      return;
    }
    onContinue(draft);
  }

  const fullNamePreview = buildFullName(draft.firstName, draft.lastName);
  const showDuplicates = duplicateCandidates.length > 0 && !duplicateLoading;

  return (
    <form className="guardian-create-form" onSubmit={submit}>
      <div className="guardian-create-form__grid">
        <Field label={t('admin.student360.guardianFirstName')} error={fieldErrors.firstName}>
          <input
            className="input"
            value={draft.firstName}
            onChange={(e) => patch({ firstName: e.target.value })}
            autoComplete="off"
          />
        </Field>
        <Field label={t('admin.student360.guardianLastName')} error={fieldErrors.lastName}>
          <input
            className="input"
            value={draft.lastName}
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
          value={draft.phone}
          onChange={(e) => patch({ phone: e.target.value })}
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
        />
        {draft.phone.trim() ? (
          <span className="tiny muted" dir="ltr">
            {formatMoroccanPhoneDisplay(draft.phone)}
          </span>
        ) : null}
      </Field>
      <Field label={t('admin.email')} error={fieldErrors.email}>
        <input
          className="input"
          type="email"
          value={draft.email}
          onChange={(e) => patch({ email: e.target.value })}
          dir="ltr"
          autoComplete="email"
        />
      </Field>

      <fieldset className="guardian-create-form__section">
        <legend className="guardian-create-form__section-title">
          {t('admin.identityDocument.sectionTitle')}
        </legend>
        <IdentityDocumentFields
          values={draft.identityDocument}
          errors={identityErrors}
          onChange={(identityPatch) =>
            patch({
              identityDocument: { ...draft.identityDocument, ...identityPatch },
            })
          }
        />
      </fieldset>

      {showDuplicates ? (
        <GuardianDuplicateSuggestions
          candidates={duplicateCandidates}
          dismissed={duplicateDismissed}
          onUseExisting={onUseExisting}
          onDismiss={() => setDuplicateDismissed(true)}
        />
      ) : null}

      <div className="guardian-create-form__actions">
        <button type="submit" className="btn btn--primary">
          {t('admin.student360.continueToRelationship')}
        </button>
      </div>
    </form>
  );
}
