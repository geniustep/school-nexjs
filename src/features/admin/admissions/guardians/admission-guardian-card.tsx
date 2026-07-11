'use client';

import { useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { IDENTITY_DOCUMENT_TYPES } from '@/types/identity-document';
import { identityDocumentTypeLabelKey } from '@/features/admin/parents/utils/identity-document';
import type { AdmissionOptionItem } from '@/types/admission';
import type { GuardianDraft, GuardianIdentityDraft } from './types';

function IdentityFields({
  values,
  onChange,
  attachmentUploadAllowed,
}: {
  values: GuardianIdentityDraft;
  onChange: (patch: Partial<GuardianIdentityDraft>) => void;
  attachmentUploadAllowed: boolean;
}) {
  const t = useT();
  const showCountry =
    values.documentType === 'passport' ||
    values.documentType === 'residence_card' ||
    values.documentType === 'other';

  return (
    <div className="admission-guardian-identity__fields">
      <label className="student-create-field">
        <span className="student-create-field__label">{t('admin.identityDocument.type')}</span>
        <select
          className="input"
          value={values.documentType}
          onChange={(e) =>
            onChange({
              documentType: e.target.value as GuardianIdentityDraft['documentType'],
              issuingCountry:
                e.target.value === 'national_id' ? 'MA' : values.issuingCountry,
            })
          }
        >
          <option value="">{t('admin.identityDocument.typeNone')}</option>
          {IDENTITY_DOCUMENT_TYPES.map((code) => (
            <option key={code} value={code}>
              {t(identityDocumentTypeLabelKey(code))}
            </option>
          ))}
        </select>
      </label>

      <label className="student-create-field">
        <span className="student-create-field__label">{t('admin.identityDocument.number')}</span>
        <input
          className="input"
          dir="ltr"
          autoComplete="off"
          spellCheck={false}
          value={values.documentNumber}
          onChange={(e) => onChange({ documentNumber: e.target.value })}
        />
      </label>

      {showCountry ? (
        <label className="student-create-field">
          <span className="student-create-field__label">{t('admin.identityDocument.country')}</span>
          <input
            className="input"
            dir="ltr"
            maxLength={2}
            value={values.issuingCountry}
            onChange={(e) => onChange({ issuingCountry: e.target.value.toUpperCase() })}
          />
        </label>
      ) : null}

      <label className="student-create-field">
        <span className="student-create-field__label">
          {t('admin.admissions.guardians.identity.issueDate')}
        </span>
        <DatePickerInput
          value={values.issueDate}
          onChange={(issueDate) => onChange({ issueDate })}
          presets={false}
        />
      </label>

      <label className="student-create-field">
        <span className="student-create-field__label">
          {t('admin.admissions.guardians.identity.expiryDate')}
        </span>
        <DatePickerInput
          value={values.expiryDate}
          onChange={(expiryDate) => onChange({ expiryDate })}
          presets={false}
          min={values.issueDate || undefined}
        />
      </label>

      {values.documentNumberMasked ? (
        <p className="tiny muted admission-guardian-identity__masked">
          {t('admin.admissions.guardians.identity.masked', {
            value: values.documentNumberMasked,
          })}
        </p>
      ) : null}

      {values.verificationState ? (
        <p className="tiny muted">
          {t('admin.admissions.guardians.identity.verificationState')}:{' '}
          {t(`admin.admissions.guardians.identity.verification.${values.verificationState}`)}
        </p>
      ) : null}

      {attachmentUploadAllowed ? (
        <p className="tiny muted admission-guardian-identity__attach-hint">
          {t('admin.admissions.guardians.identity.attachmentsReadyHint')}
        </p>
      ) : (
        <p className="tiny muted admission-guardian-identity__attach-hint">
          {t('admin.admissions.guardians.identity.attachmentsDeferredHint')}
        </p>
      )}
    </div>
  );
}

export function AdmissionGuardianCard({
  guardian,
  index,
  mode,
  relationships,
  relationshipsLoading,
  relationshipLoadFailed,
  childrenOptions,
  canRemove,
  onChange,
  onRemove,
  onSetPrimary,
  onSearchExisting,
  searchBusyKey,
}: {
  guardian: GuardianDraft;
  index: number;
  mode: 'individual' | 'family';
  relationships: AdmissionOptionItem[];
  relationshipsLoading?: boolean;
  relationshipLoadFailed?: boolean;
  childrenOptions?: { clientKey: string; label: string }[];
  canRemove: boolean;
  onChange: (patch: Partial<GuardianDraft>) => void;
  onRemove: () => void;
  onSetPrimary: () => void;
  onSearchExisting: () => void;
  searchBusyKey?: string | null;
}) {
  const t = useT();
  const isLinked = guardian.guardianId != null;
  const [localIdentityOpen, setLocalIdentityOpen] = useState(guardian.identityOpen);
  const identityOpen = localIdentityOpen;

  function patchIdentity(patch: Partial<GuardianIdentityDraft>) {
    onChange({
      identityDocument: { ...guardian.identityDocument, ...patch },
    });
  }

  return (
    <article
      className={`admission-guardian-card${guardian.isPrimaryContact ? ' admission-guardian-card--primary' : ''}`}
    >
      <header className="admission-guardian-card__header">
        <div>
          <h3 className="admission-guardian-card__title">
            {guardian.isPrimaryContact
              ? t('admin.admissions.guardians.primaryCardTitle')
              : t('admin.admissions.guardians.additionalCardTitle', { index: index + 1 })}
          </h3>
          {isLinked ? (
            <p className="tiny muted">{t('admin.admissions.guardians.linkedBadge')}</p>
          ) : null}
        </div>
        <div className="admission-guardian-card__actions">
          {!isLinked ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onSearchExisting}>
              {searchBusyKey === guardian.clientKey
                ? t('admin.admissions.guardians.searching')
                : t('admin.admissions.guardians.searchExisting')}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() =>
                onChange({
                  guardianId: undefined,
                  personId: undefined,
                })
              }
            >
              {t('admin.admissions.guardians.enterNew')}
            </button>
          )}
          {canRemove ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm admission-guardian-card__remove"
              onClick={onRemove}
            >
              {t('admin.admissions.guardians.removeFromRequest')}
            </button>
          ) : null}
        </div>
      </header>

      <div className="student-create-form__grid admission-guardian-card__grid">
        <div className="student-create-form__cell">
          <label className="student-create-field">
            <span className="student-create-field__label">
              {t('admin.admissions.fields.guardianName')}
            </span>
            <input
              className="input"
              value={guardian.name}
              readOnly={isLinked}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </label>
        </div>
        <div className="student-create-form__cell">
          <label className="student-create-field">
            <span className="student-create-field__label">
              {t('admin.admissions.fields.relationship')}
            </span>
            {relationshipLoadFailed ? (
              <p className="student-create-field__hint">
                {t('admin.admissions.create.relationshipLoadError')}
              </p>
            ) : (
              <select
                className="input"
                value={guardian.relationship}
                disabled={relationshipsLoading}
                onChange={(e) => onChange({ relationship: e.target.value })}
              >
                <option value="">{t('admin.admissions.create.selectRelationship')}</option>
                {relationships.map((rel) => {
                  const value = String(rel.value ?? rel.id ?? rel.code ?? '');
                  return (
                    <option key={value} value={value}>
                      {rel.label}
                    </option>
                  );
                })}
              </select>
            )}
          </label>
        </div>
        <div className="student-create-form__cell">
          <label className="student-create-field">
            <span className="student-create-field__label">
              {t('admin.admissions.fields.guardianPhone')}
            </span>
            <input
              className="input"
              dir="ltr"
              value={guardian.phone}
              readOnly={isLinked}
              onChange={(e) => onChange({ phone: e.target.value })}
            />
          </label>
        </div>
        <div className="student-create-form__cell">
          <label className="student-create-field">
            <span className="student-create-field__label">
              {t('admin.admissions.fields.guardianWhatsapp')}
            </span>
            <input
              className="input"
              dir="ltr"
              value={guardian.whatsapp}
              onChange={(e) => onChange({ whatsapp: e.target.value })}
            />
          </label>
        </div>
        <div className="student-create-form__cell">
          <label className="student-create-field">
            <span className="student-create-field__label">
              {t('admin.admissions.fields.guardianEmail')}
            </span>
            <input
              className="input"
              type="email"
              dir="ltr"
              value={guardian.email}
              readOnly={isLinked}
              onChange={(e) => onChange({ email: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="admission-guardian-card__flags">
        <label className="student-create-form__checkbox">
          <input
            type="radio"
            name="admission-primary-guardian"
            checked={guardian.isPrimaryContact}
            onChange={() => onSetPrimary()}
          />
          <span>{t('admin.admissions.guardians.isPrimaryContact')}</span>
        </label>
        <label className="student-create-form__checkbox">
          <input
            type="checkbox"
            checked={guardian.isAccompanyingGuardian}
            onChange={(e) => onChange({ isAccompanyingGuardian: e.target.checked })}
          />
          <span>{t('admin.admissions.guardians.isAccompanying')}</span>
        </label>
      </div>

      {mode === 'family' ? (
        <div className="admission-guardian-card__children">
          <label className="student-create-form__checkbox">
            <input
              type="checkbox"
              checked={guardian.appliesToAllChildren}
              onChange={(e) =>
                onChange({
                  appliesToAllChildren: e.target.checked,
                  linkedChildClientKeys: e.target.checked ? [] : guardian.linkedChildClientKeys,
                })
              }
            />
            <span>{t('admin.admissions.guardians.appliesToAllChildren')}</span>
          </label>
          {!guardian.appliesToAllChildren && childrenOptions ? (
            <div className="admission-guardian-card__child-picks">
              {childrenOptions.map((child) => {
                const checked = guardian.linkedChildClientKeys.includes(child.clientKey);
                return (
                  <label key={child.clientKey} className="student-create-form__checkbox">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...guardian.linkedChildClientKeys, child.clientKey]
                          : guardian.linkedChildClientKeys.filter((k) => k !== child.clientKey);
                        onChange({ linkedChildClientKeys: next });
                      }}
                    />
                    <span>{child.label}</span>
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="admission-guardian-identity">
        <button
          type="button"
          className="admission-guardian-identity__toggle"
          aria-expanded={identityOpen}
          onClick={() => {
            setLocalIdentityOpen((v) => !v);
            onChange({ identityOpen: !identityOpen });
          }}
        >
          <span>{t('admin.admissions.guardians.identity.sectionTitle')}</span>
          <span aria-hidden>{identityOpen ? '▴' : '▾'}</span>
        </button>
        {identityOpen ? (
          <IdentityFields
            values={guardian.identityDocument}
            onChange={patchIdentity}
            attachmentUploadAllowed={Boolean(guardian.guardianId)}
          />
        ) : null}
      </div>
    </article>
  );
}
