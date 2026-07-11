'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { AttachmentPreviewModal } from '@/components/attachments/attachment-preview-modal';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type { AttachmentMeta } from '@/types/attachment';
import {
  normalizeAdmissionGuardiansForDisplay,
  normalizeAdmissionGuardianSectionWarnings,
  resolveGuardianIdentityAttachmentPreviewUrl,
  type AdmissionGuardianDisplay,
  type AdmissionGuardianDisplayChild,
} from './normalize-admission-guardians-display';
import { translateAdmissionGuardianWarning } from './admission-guardian-warnings';
import type {
  AdmissionGuardianRead,
  AdmissionWarningDetail,
} from './types';
import { OverviewEmptyValue, OverviewRow } from '../components/admission-overview-primitives';

function attachmentMetaFromId(id: number, name: string): AttachmentMeta {
  const preview = resolveGuardianIdentityAttachmentPreviewUrl(id);
  return {
    id,
    name,
    is_image: true,
    is_previewable: true,
    preview_url: preview,
    download_url: `/api/attachments/${id}/download`,
  };
}

function GuardianIdentityBlock({
  guardian,
}: {
  guardian: AdmissionGuardianDisplay;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const [preview, setPreview] = useState<AttachmentMeta | null>(null);
  const identity = guardian.identity;

  if (!identity.hasDocument) {
    return (
      <div className="admission-guardian-details-identity">
        <h4 className="admission-guardian-details-identity__title">
          {t('admin.admissions.guardians.details.identityTitle')}
        </h4>
        <p className="muted admission-guardian-details-identity__empty">
          {t('admin.admissions.guardians.details.identityMissing')}
        </p>
      </div>
    );
  }

  const typeLabel = identity.documentType
    ? t(`admin.identityDocument.types.${identity.documentType}`)
    : null;
  const verificationLabel = identity.verificationState
    ? t(`admin.admissions.guardians.identity.verification.${identity.verificationState}`)
    : null;

  const frontUrl = resolveGuardianIdentityAttachmentPreviewUrl(identity.frontAttachmentId);
  const backUrl = resolveGuardianIdentityAttachmentPreviewUrl(identity.backAttachmentId);
  const hasAnyImage = Boolean(frontUrl || backUrl);

  return (
    <div className="admission-guardian-details-identity">
      <h4 className="admission-guardian-details-identity__title">
        {t('admin.admissions.guardians.details.identityTitle')}
      </h4>
      <div className="admission-guardian-details-identity__rows">
        {typeLabel ? (
          <OverviewRow
            label={t('admin.identityDocument.type')}
            value={typeLabel}
          />
        ) : null}
        <OverviewRow
          label={t('admin.admissions.guardians.details.maskedNumber')}
          value={
            identity.documentNumberMasked ? (
              <span className="mono" dir="ltr">
                {identity.documentNumberMasked}
              </span>
            ) : (
              <OverviewEmptyValue />
            )
          }
        />
        {identity.issuingCountry ? (
          <OverviewRow
            label={t('admin.identityDocument.country')}
            value={<span dir="ltr">{identity.issuingCountry}</span>}
          />
        ) : null}
        {identity.issueDate ? (
          <OverviewRow
            label={t('admin.admissions.guardians.identity.issueDate')}
            value={formatDate(identity.issueDate)}
          />
        ) : null}
        {identity.expiryDate ? (
          <OverviewRow
            label={t('admin.admissions.guardians.identity.expiryDate')}
            value={formatDate(identity.expiryDate)}
          />
        ) : null}
        {verificationLabel ? (
          <OverviewRow
            label={t('admin.admissions.guardians.identity.verificationState')}
            value={
              <span className="admission-guardian-details-badges">
                <Badge tone="slate">{verificationLabel}</Badge>
                {identity.isExpired ? (
                  <Badge tone="amber">
                    {t('admin.admissions.guardians.details.expiredBadge')}
                  </Badge>
                ) : null}
              </span>
            }
          />
        ) : identity.isExpired ? (
          <OverviewRow
            label={t('admin.admissions.guardians.identity.verificationState')}
            value={
              <Badge tone="amber">
                {t('admin.admissions.guardians.details.expiredBadge')}
              </Badge>
            }
          />
        ) : null}
      </div>

      <div className="admission-guardian-details-attachments">
        {hasAnyImage ? (
          <div className="admission-guardian-details-attachments__actions">
            {frontUrl && identity.frontAttachmentId != null ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() =>
                  setPreview(
                    attachmentMetaFromId(
                      identity.frontAttachmentId!,
                      t('admin.admissions.guardians.details.frontImage'),
                    ),
                  )
                }
              >
                {t('admin.admissions.guardians.details.viewFront')}
              </button>
            ) : null}
            {backUrl && identity.backAttachmentId != null ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() =>
                  setPreview(
                    attachmentMetaFromId(
                      identity.backAttachmentId!,
                      t('admin.admissions.guardians.details.backImage'),
                    ),
                  )
                }
              >
                {t('admin.admissions.guardians.details.viewBack')}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="muted admission-guardian-details-attachments__empty">
            {t('admin.admissions.guardians.details.noImages')}
          </p>
        )}
      </div>

      <AttachmentPreviewModal
        attachment={preview}
        open={preview != null}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}

function GuardianDetailsCard({
  guardian,
  showChildrenLinks,
  additionalIndex,
}: {
  guardian: AdmissionGuardianDisplay;
  showChildrenLinks: boolean;
  additionalIndex: number;
}) {
  const t = useT();
  const title = guardian.isPrimaryContact
    ? t('admin.admissions.guardians.primaryCardTitle')
    : t('admin.admissions.guardians.additionalCardTitle', { index: additionalIndex });

  const childLinkLabel = guardian.appliesToAllChildren
    ? t('admin.admissions.guardians.details.linkedAllChildren')
    : guardian.linkedChildLabels.length > 0
      ? guardian.linkedChildLabels
          .map((label) =>
            label.trim()
              ? label
              : t('admin.admissions.guardians.details.unknownChild'),
          )
          .join(' · ')
      : t('admin.admissions.guardians.details.noLinkedChildren');

  return (
    <article
      className={
        guardian.isPrimaryContact
          ? 'admission-guardian-details-card admission-guardian-details-card--primary'
          : 'admission-guardian-details-card'
      }
    >
      <header className="admission-guardian-details-card__header">
        <div>
          <h3 className="admission-guardian-details-card__title">{title}</h3>
          <p className="admission-guardian-details-card__name">
            {guardian.name || <OverviewEmptyValue />}
          </p>
        </div>
        <div className="admission-guardian-details-badges">
          {guardian.isPrimaryContact ? (
            <Badge tone="blue">{t('admin.admissions.guardians.primaryBadge')}</Badge>
          ) : null}
          {guardian.isAccompanyingGuardian ? (
            <Badge tone="slate">{t('admin.admissions.guardians.accompanyingBadge')}</Badge>
          ) : null}
        </div>
      </header>

      <div className="admission-guardian-details-card__rows">
        <OverviewRow
          label={t('admin.admissions.fields.relationship')}
          value={guardian.relationship || null}
        />
        <OverviewRow
          label={t('admin.admissions.fields.guardianPhone')}
          value={guardian.phone || null}
          dir="ltr"
        />
        {guardian.whatsapp ? (
          <OverviewRow
            label={t('admin.admissions.fields.guardianWhatsapp')}
            value={guardian.whatsapp}
            dir="ltr"
          />
        ) : null}
        {guardian.email ? (
          <OverviewRow
            label={t('admin.admissions.fields.guardianEmail')}
            value={guardian.email}
            dir="ltr"
          />
        ) : null}
        {showChildrenLinks ? (
          <OverviewRow
            label={t('admin.admissions.guardians.details.childrenLink')}
            value={childLinkLabel}
          />
        ) : null}
      </div>

      {guardian.warnings.length > 0 ? (
        <ul className="admission-guardians-warnings admission-guardian-details-card__warnings">
          {guardian.warnings.map((w) => (
            <li key={`${guardian.key}-${w.code}-${w.guardian_index ?? ''}`}>
              {translateAdmissionGuardianWarning(w.code, t, w.message)}
            </li>
          ))}
        </ul>
      ) : null}

      <GuardianIdentityBlock guardian={guardian} />
    </article>
  );
}

export function AdmissionGuardiansDetails({
  guardians,
  legacyFlat,
  sharedContact,
  childrenOptions,
  warnings,
  mode,
}: {
  guardians?: AdmissionGuardianRead[] | null;
  legacyFlat?: {
    guardian_name?: string | null;
    guardian_phone?: string | null;
    guardian_whatsapp?: string | null;
    guardian_email?: string | null;
    guardian_relationship?: string | null;
    relationship?: string | null;
    guardian_id?: number | null;
  };
  sharedContact?: {
    guardian_id?: number | false | null;
    guardian_name?: string | null;
    guardian_phone?: string | null;
    guardian_whatsapp?: string | null;
    guardian_email?: string | null;
    relationship?: string | null;
  } | null;
  childrenOptions?: AdmissionGuardianDisplayChild[];
  warnings?: AdmissionWarningDetail[] | null;
  mode: 'individual' | 'family';
}) {
  const t = useT();
  const displayed = useMemo(
    () =>
      normalizeAdmissionGuardiansForDisplay({
        guardians,
        legacyFlat,
        sharedContact,
        children: childrenOptions,
        warnings,
      }),
    [guardians, legacyFlat, sharedContact, childrenOptions, warnings],
  );

  const sectionWarnings = useMemo(
    () => normalizeAdmissionGuardianSectionWarnings(warnings, displayed),
    [warnings, displayed],
  );

  if (displayed.length === 0) {
    return (
      <section className="admission-guardians-details">
        <header className="admission-guardians-details__header">
          <h2 className="admission-guardians-details__title">
            {t('admin.admissions.guardians.sectionTitle')}
          </h2>
        </header>
        <p className="muted">{t('admin.admissions.guardians.details.empty')}</p>
      </section>
    );
  }

  let additionalIndex = 0;

  return (
    <section className="admission-guardians-details">
      <header className="admission-guardians-details__header">
        <h2 className="admission-guardians-details__title">
          {t('admin.admissions.guardians.sectionTitle')}
        </h2>
        <p className="admission-guardians-details__lead muted">
          {t('admin.admissions.guardians.details.lead', { count: displayed.length })}
        </p>
      </header>

      {sectionWarnings.length > 0 ? (
        <ul className="admission-guardians-warnings">
          {sectionWarnings.map((w) => (
            <li key={`section-${w.code}-${w.child_index ?? ''}-${w.guardian_id ?? ''}`}>
              {translateAdmissionGuardianWarning(w.code, t, w.message)}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="admission-guardians-details__list">
        {displayed.map((g) => {
          const idx = g.isPrimaryContact ? 0 : ++additionalIndex;
          return (
            <GuardianDetailsCard
              key={g.key}
              guardian={g}
              showChildrenLinks={mode === 'family'}
              additionalIndex={idx}
            />
          );
        })}
      </div>
    </section>
  );
}
