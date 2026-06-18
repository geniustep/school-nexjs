'use client';

import { useT } from '@/features/i18n/locale-context';
import {
  formatMoroccanPhoneDisplay,
  validateMoroccanPhone,
} from '../utils/normalize-moroccan-phone';
import type { ContactPatchDraft, ContactPatchTouched } from '../utils/guardian-contact-requirements';

export function GuardianContactRequiredSection({
  patch,
  touched,
  onPatch,
  onTouch,
  error,
  open = true,
}: {
  patch: ContactPatchDraft;
  touched: ContactPatchTouched;
  onPatch: (partial: Partial<ContactPatchDraft>) => void;
  onTouch: (partial: Partial<ContactPatchTouched>) => void;
  error?: string | null;
  open?: boolean;
}) {
  const t = useT();
  if (!open) return null;

  const phoneError =
    touched.phone && patch.phone.trim() && !validateMoroccanPhone(patch.phone)
      ? t('admin.student360.guardianPhoneInvalid')
      : undefined;

  return (
    <section className="guardian-contact-required" aria-labelledby="guardian-contact-required-title">
      <h3 id="guardian-contact-required-title" className="guardian-contact-required__title">
        {t('admin.student360.contactRequiredSectionTitle')}
      </h3>
      <p className="tiny muted guardian-contact-required__lead">
        {error ?? t('admin.student360.contactRequiredSectionLead')}
      </p>
      <div className="guardian-contact-required__grid">
        <label className="guardian-create-field">
          <span className="tiny muted">{t('admin.phone')}</span>
          <input
            className="input"
            value={patch.phone}
            onChange={(e) => {
              onPatch({ phone: e.target.value });
              onTouch({ phone: true });
            }}
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
          />
          {patch.phone.trim() ? (
            <span className="tiny muted" dir="ltr">
              {formatMoroccanPhoneDisplay(patch.phone)}
            </span>
          ) : null}
          {phoneError ? (
            <span className="tiny guardian-create-field__error" role="alert">
              {phoneError}
            </span>
          ) : null}
        </label>
        <label className="guardian-create-field">
          <span className="tiny muted">{t('admin.email')}</span>
          <input
            className="input"
            type="email"
            value={patch.email}
            onChange={(e) => {
              onPatch({ email: e.target.value });
              onTouch({ email: true });
            }}
            dir="ltr"
            autoComplete="email"
          />
        </label>
      </div>
    </section>
  );
}
