'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { Badge, Card, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { formatRoleLabels } from '@/features/admin/students/utils/person-role-presentation';
import { preferredLanguageLabel } from '../utils/normalize-parent-profile';
import {
  buildParentUpdatePayload,
  formValuesEqual,
  parentToFormValues,
  type ParentPersonFormValues,
} from '../utils/build-parent-update-payload';
import { mapParentApiError } from '../utils/map-parent-api-error';
import {
  validateIdentityDocumentForm,
  type IdentityDocumentFieldErrors,
} from '../utils/identity-document';
import { IdentityDocumentFields } from './identity-document-fields';
import { IdentityDocumentConflictAlert } from './identity-document-conflict-alert';
import { ParentRelationshipsSection } from './parent-relationships-section';
import type { GuardianDuplicateMatch } from '@/types/student-360';
import type { Parent } from '@/types/parent';

const LANGUAGE_CODES = ['ar', 'fr', 'en', 'es'] as const;

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | null;
}) {
  return (
    <label className="parent-edit-form__field">
      <span className="tiny muted">{label}</span>
      {children}
      {error ? <span className="tiny parent-edit-form__field-error">{error}</span> : null}
    </label>
  );
}

export function ParentEditForm({
  parent,
  onSaved,
  onCancel,
  onRelationshipChanged,
}: {
  parent: Parent;
  onSaved: () => void;
  onCancel: () => void;
  onRelationshipChanged: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const initialValues = useMemo(() => parentToFormValues(parent), [parent]);
  const [values, setValues] = useState<ParentPersonFormValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'name', string>>>({});
  const [identityErrors, setIdentityErrors] = useState<IdentityDocumentFieldErrors>({});
  const [identityCandidates, setIdentityCandidates] = useState<GuardianDuplicateMatch[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValues(initialValues);
    setFieldErrors({});
    setIdentityErrors({});
    setIdentityCandidates([]);
  }, [initialValues]);

  const hasAccount =
    parent.account?.has_user_account === true ||
    !!(parent.has_user_account ?? parent.has_account);
  const roleLine = formatRoleLabels(parent.role_labels);
  const dirty = !formValuesEqual(values, initialValues);

  function patch(partial: Partial<ParentPersonFormValues>) {
    setValues((prev) => ({ ...prev, ...partial }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(partial) as (keyof ParentPersonFormValues)[]) {
        if (key === 'name') delete next.name;
      }
      return next;
    });
    setIdentityCandidates([]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      setFieldErrors({ name: t('errors.validationFailed') });
      nameRef.current?.focus();
      toast.error(t('errors.validationFailed'));
      return;
    }

    const nextIdentityErrors = validateIdentityDocumentForm(values.identityDocument, t);
    if (Object.keys(nextIdentityErrors).length > 0) {
      setIdentityErrors(nextIdentityErrors);
      toast.error(t('errors.validationFailed'));
      return;
    }

    if (!dirty || saving) return;

    setSaving(true);
    setIdentityCandidates([]);
    const payload = buildParentUpdatePayload(values, initialValues);
    const res = await api.post(endpoints.admin.parentUpdate(parent.id), payload);
    setSaving(false);

    if (res.success) {
      toast.success(t('admin.parentProfile.saveSuccess'));
      onSaved();
      return;
    }

    if (!res.success) {
      const mapped = mapParentApiError(res.error, t);
      toast.error(mapped.message);
      if (mapped.identityConflict) {
        setIdentityCandidates(mapped.candidates ?? []);
      }
      if (!values.name.trim()) nameRef.current?.focus();
    }
  }

  return (
    <div className="parent-edit-form">
      <form className="parent-edit-form__person" onSubmit={submit} noValidate>
        <Card className="parent-edit-form__section">
          <SectionHead title={t('admin.parentProfile.personalInformation')} />
          <div className="parent-edit-form__grid">
            <Field label={t('admin.fullName')} error={fieldErrors.name}>
              <input
                ref={nameRef}
                className="input"
                value={values.name}
                onChange={(e) => patch({ name: e.target.value })}
                required
                dir="auto"
              />
            </Field>
            <Field label={t('admin.phone')}>
              <input
                className="input"
                value={values.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                dir="ltr"
              />
            </Field>
            <Field label={t('admin.student360.mobile')}>
              <input
                className="input"
                value={values.mobile}
                onChange={(e) => patch({ mobile: e.target.value })}
                dir="ltr"
              />
            </Field>
            <Field label={t('admin.email')}>
              <input
                className="input"
                type="email"
                value={values.email}
                onChange={(e) => patch({ email: e.target.value })}
                dir="ltr"
              />
            </Field>
            <Field label={t('admin.student360.address')}>
              <input
                className="input"
                value={values.street}
                onChange={(e) => patch({ street: e.target.value })}
                dir="auto"
              />
            </Field>
            <Field label={t('admin.student360.city')}>
              <input
                className="input"
                value={values.city}
                onChange={(e) => patch({ city: e.target.value })}
                dir="auto"
              />
            </Field>
          </div>
        </Card>

        <Card className="parent-edit-form__section">
          <SectionHead title={t('admin.identityDocument.sectionTitle')} />
          <IdentityDocumentFields
            values={values.identityDocument}
            errors={identityErrors}
            showClear
            onChange={(identityPatch) => {
              setIdentityErrors({});
              patch({
                identityDocument: { ...values.identityDocument, ...identityPatch },
              });
            }}
          />
          {identityCandidates.length > 0 ? (
            <IdentityDocumentConflictAlert candidates={identityCandidates} />
          ) : null}
        </Card>

        <Card className="parent-edit-form__section">
          <SectionHead title={t('admin.parentProfile.preferences')} />
          <div className="parent-edit-form__grid parent-edit-form__grid--prefs">
            <Field label={t('admin.preferredLanguage')}>
              <select
                className="input"
                value={values.preferred_language}
                onChange={(e) => patch({ preferred_language: e.target.value })}
              >
                {LANGUAGE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {preferredLanguageLabel(t, code)}
                  </option>
                ))}
              </select>
            </Field>
            <label className="parent-edit-form__checkbox">
              <input
                type="checkbox"
                checked={values.notification_opt_in}
                onChange={(e) => patch({ notification_opt_in: e.target.checked })}
              />
              <span className="tiny">{t('admin.notificationOptIn')}</span>
            </label>
          </div>
        </Card>

        <Card className="parent-edit-form__section parent-edit-form__account">
          <SectionHead title={t('admin.parentProfile.accountAndRoles')} />
          <div className="parent-edit-form__account-body">
            {hasAccount ? (
              <Badge tone="green">{t('admin.parentProfile.existingLoginAccount')}</Badge>
            ) : (
              <p className="muted">{t('admin.student360.noLoginAccount')}</p>
            )}
            {roleLine ? (
              <p className="tiny muted">
                {t('admin.parentProfile.currentRoles')}: {roleLine}
              </p>
            ) : null}
            {hasAccount ? (
              <p className="tiny muted">{t('admin.parentProfile.manageAccountHint')}</p>
            ) : null}
          </div>
        </Card>

        <div className="parent-edit-form__actions">
          <button type="submit" className="btn btn--primary" disabled={!dirty || saving}>
            {saving ? t('admin.parentProfile.savingChanges') : t('admin.parentProfile.saveChanges')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={saving}>
            {t('common.cancel')}
          </button>
        </div>
      </form>

      <Card className="parent-edit-form__relationships-card">
        <ParentRelationshipsSection parent={parent} onRelationshipChanged={onRelationshipChanged} />
      </Card>
    </div>
  );
}
