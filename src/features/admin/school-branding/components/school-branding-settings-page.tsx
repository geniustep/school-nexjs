'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '@/features/admin/school-branding/school-branding-settings.css';
import '@/features/admin/school-branding/school-branding-identity.css';
import { InfoBanner, PageHeader } from '@/components/ui/primitives';
import { LoadingState, ErrorState } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { loginSchoolBrand } from '@/lib/login-school-brand';
import { SCHOOL_BRANDING_WELCOME_SUBTITLE_MAX } from '@/features/admin/school-branding/constants';
import { SCHOOL_BRANDING_PROFILE_COPY } from '@/features/admin/school-branding/copy';
import { SchoolBrandingLogoField } from '@/features/admin/school-branding/components/school-branding-logo-field';
import { SchoolBrandingColorField } from '@/features/admin/school-branding/components/school-branding-color-field';
import { SchoolBrandingPreview } from '@/features/admin/school-branding/components/school-branding-preview';
import { SchoolBrandingTextField } from '@/features/admin/school-branding/components/school-branding-text-field';
import { SchoolBrandingDocumentPreview } from '@/features/admin/school-branding/components/school-branding-document-preview';
import {
  useSchoolBrandingSettings,
  type SchoolBrandingFieldErrors,
  type SchoolBrandingSaveInput,
  type SchoolBrandingSettingsData,
} from '@/features/admin/school-branding/hooks/use-school-branding-settings';
import {
  isValidSchoolBrandingHexColor,
  normalizeSchoolBrandingHexColor,
  readFileAsBase64,
} from '@/features/admin/school-branding/utils/branding-form';

type SchoolProfileDraft = {
  schoolNameAr: string;
  schoolNameLat: string;
  schoolShortName: string;
  street: string;
  city: string;
  phone: string;
  email: string;
  website: string;
};

type SchoolProfileKey = keyof SchoolProfileDraft;

const EMPTY_PROFILE: SchoolProfileDraft = {
  schoolNameAr: '',
  schoolNameLat: '',
  schoolShortName: '',
  street: '',
  city: '',
  phone: '',
  email: '',
  website: '',
};

const PROFILE_KEYS: SchoolProfileKey[] = [
  'schoolNameAr',
  'schoolNameLat',
  'schoolShortName',
  'street',
  'city',
  'phone',
  'email',
  'website',
];

function profileFromServer(data: SchoolBrandingSettingsData): SchoolProfileDraft {
  return {
    schoolNameAr: data.schoolNameAr ?? '',
    schoolNameLat: data.schoolNameLat ?? '',
    schoolShortName: data.schoolShortName ?? '',
    street: data.street ?? '',
    city: data.city ?? '',
    phone: data.phone ?? '',
    email: data.email ?? '',
    website: data.website ?? '',
  };
}

function sameTrimmed(left: string, right: string): boolean {
  return left.trim() === right.trim();
}

export function SchoolBrandingSettingsPage() {
  const t = useT();
  const { locale } = useLocale();
  const copy = SCHOOL_BRANDING_PROFILE_COPY[locale];
  const toast = useToast();
  const router = useRouter();
  const { state, reload, save } = useSchoolBrandingSettings();

  const [draftProfile, setDraftProfile] = useState<SchoolProfileDraft>(EMPTY_PROFILE);
  const [baselineProfile, setBaselineProfile] = useState<SchoolProfileDraft>(EMPTY_PROFILE);
  const [draftSubtitle, setDraftSubtitle] = useState('');
  const [baselineSubtitle, setBaselineSubtitle] = useState('');
  const [draftPrimary, setDraftPrimary] = useState('');
  const [baselinePrimary, setBaselinePrimary] = useState('');
  const [draftSecondary, setDraftSecondary] = useState('');
  const [baselineSecondary, setBaselineSecondary] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [clearLogo, setClearLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SchoolBrandingFieldErrors>({});
  const [reloading, setReloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoCacheKey, setLogoCacheKey] = useState(0);

  const ready = state.status === 'ready' ? state.data : null;

  function resetFromServer(data: SchoolBrandingSettingsData, revokePreview?: string | null) {
    if (revokePreview) URL.revokeObjectURL(revokePreview);
    const profile = profileFromServer(data);
    setDraftProfile(profile);
    setBaselineProfile(profile);
    setDraftSubtitle(data.welcomeSubtitle ?? '');
    setBaselineSubtitle(data.welcomeSubtitle ?? '');
    setDraftPrimary(data.primaryColor ?? '');
    setBaselinePrimary(data.primaryColor ?? '');
    setDraftSecondary(data.secondaryColor ?? '');
    setBaselineSecondary(data.secondaryColor ?? '');
    setLogoPreviewUrl(null);
    setPendingLogoFile(null);
    setClearLogo(false);
    setLogoError(null);
    setFieldErrors({});
    setLogoCacheKey(Date.now());
  }

  useEffect(() => {
    if (!ready) return;
    resetFromServer(ready, logoPreviewUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset drafts only when server data changes
  }, [ready]);

  const schoolLabel = useMemo(() => {
    const draftArabicName = draftProfile.schoolNameAr.trim();
    if (draftArabicName) return draftArabicName;
    if (!ready) return '';
    if (ready.branding.fromApi && ready.branding.schoolName) {
      return ready.branding.schoolName;
    }
    return loginSchoolBrand.schoolDisplayName ?? t('auth.hero.schoolNameDefault');
  }, [draftProfile.schoolNameAr, ready, t]);

  const profileDirty = PROFILE_KEYS.some(
    (key) => !sameTrimmed(draftProfile[key], baselineProfile[key]),
  );
  const dirty =
    !!ready &&
    (profileDirty ||
      !sameTrimmed(draftSubtitle, baselineSubtitle) ||
      !sameTrimmed(draftPrimary, baselinePrimary) ||
      !sameTrimmed(draftSecondary, baselineSecondary) ||
      pendingLogoFile !== null ||
      clearLogo);

  function updateProfileField(key: SchoolProfileKey, value: string) {
    setDraftProfile((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateClient(): SchoolBrandingFieldErrors {
    const errors: SchoolBrandingFieldErrors = {};
    if (!draftSubtitle.trim()) {
      errors.welcomeSubtitle = t('admin.settings.schoolBranding.slogan.required');
    }
    if (!isValidSchoolBrandingHexColor(draftPrimary)) {
      errors.primaryColor = t('admin.settings.schoolBranding.colors.invalid');
    }
    if (!isValidSchoolBrandingHexColor(draftSecondary)) {
      errors.secondaryColor = t('admin.settings.schoolBranding.colors.invalid');
    }
    return errors;
  }

  async function handleReload() {
    setReloading(true);
    await reload();
    setReloading(false);
  }

  function handleCancel() {
    if (dirty && ready) {
      resetFromServer(ready, logoPreviewUrl);
      return;
    }
    router.push('/admin/settings');
  }

  async function handleSave() {
    if (!ready) return;
    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0 || logoError) {
      setFieldErrors(clientErrors);
      return;
    }

    setSaving(true);
    setFieldErrors({});

    let logoBase64: string | null | undefined;
    if (pendingLogoFile) {
      try {
        logoBase64 = await readFileAsBase64(pendingLogoFile);
      } catch {
        setLogoError(t('admin.settings.schoolBranding.logo.loadFailed'));
        setSaving(false);
        return;
      }
    }

    // Delta-only save is intentional. Odoo can return school_name_ar as a fallback
    // to legacy school.name; sending untouched values would materialize that fallback.
    const input: SchoolBrandingSaveInput = {};

    if (!sameTrimmed(draftProfile.schoolNameAr, baselineProfile.schoolNameAr)) {
      input.schoolNameAr = draftProfile.schoolNameAr.trim();
    }
    if (!sameTrimmed(draftProfile.schoolNameLat, baselineProfile.schoolNameLat)) {
      input.schoolNameLat = draftProfile.schoolNameLat.trim();
    }
    if (!sameTrimmed(draftProfile.schoolShortName, baselineProfile.schoolShortName)) {
      input.schoolShortName = draftProfile.schoolShortName.trim();
    }
    if (!sameTrimmed(draftProfile.street, baselineProfile.street)) {
      input.street = draftProfile.street.trim();
    }
    if (!sameTrimmed(draftProfile.city, baselineProfile.city)) {
      input.city = draftProfile.city.trim();
    }
    if (!sameTrimmed(draftProfile.phone, baselineProfile.phone)) {
      input.phone = draftProfile.phone.trim();
    }
    if (!sameTrimmed(draftProfile.email, baselineProfile.email)) {
      input.email = draftProfile.email.trim();
    }
    if (!sameTrimmed(draftProfile.website, baselineProfile.website)) {
      input.website = draftProfile.website.trim();
    }
    if (!sameTrimmed(draftSubtitle, baselineSubtitle)) {
      input.welcomeSubtitle = draftSubtitle.trim();
    }
    if (!sameTrimmed(draftPrimary, baselinePrimary)) {
      input.primaryColor = normalizeSchoolBrandingHexColor(draftPrimary);
    }
    if (!sameTrimmed(draftSecondary, baselineSecondary)) {
      input.secondaryColor = normalizeSchoolBrandingHexColor(draftSecondary);
    }
    if (pendingLogoFile) input.logoBase64 = logoBase64;
    if (clearLogo) input.clearLogo = true;

    const result = await save(input);
    setSaving(false);

    if (!result.ok) {
      if (result.message === 'forbidden') {
        toast.error(t('admin.pageForbidden'));
        return;
      }
      if (result.message === 'save_contract_unavailable') {
        toast.error(t('admin.settings.schoolBranding.saveContractError'));
        return;
      }

      const nextErrors = { ...result.fieldErrors };
      for (const key of PROFILE_KEYS) {
        if (nextErrors[key] === 'validation') nextErrors[key] = copy.invalidField;
      }
      if (nextErrors.welcomeSubtitle === 'validation') {
        nextErrors.welcomeSubtitle = t('admin.settings.schoolBranding.slogan.required');
      }
      if (nextErrors.primaryColor === 'validation') {
        nextErrors.primaryColor = t('admin.settings.schoolBranding.colors.invalid');
      }
      if (nextErrors.secondaryColor === 'validation') {
        nextErrors.secondaryColor = t('admin.settings.schoolBranding.colors.invalid');
      }
      setFieldErrors(nextErrors);
      toast.error(t('admin.settings.schoolBranding.saveError'));
      return;
    }

    resetFromServer(result.data, logoPreviewUrl);
    toast.success(t('admin.settings.schoolBranding.saveSuccess'));
  }

  if (state.status === 'loading' && !ready) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (state.status === 'error') {
    const message =
      state.message === 'forbidden'
        ? t('admin.pageForbidden')
        : t('admin.settings.schoolBranding.loadError');
    return (
      <ErrorState
        error={{ code: state.message, message, details: {} }}
        onRetry={() => void reload()}
      />
    );
  }

  if (!ready) {
    return (
      <ErrorState
        error={{ code: 'load_failed', message: t('admin.settings.schoolBranding.loadError'), details: {} }}
        onRetry={() => void reload()}
      />
    );
  }

  const clientErrors = validateClient();
  const canSave =
    ready.saveAvailable &&
    dirty &&
    Object.keys(clientErrors).length === 0 &&
    !logoError &&
    !saving;
  const counterNearLimit = draftSubtitle.length >= SCHOOL_BRANDING_WELCOME_SUBTITLE_MAX - 10;

  return (
    <div className="school-branding-page">
      <Link href="/admin/settings" className="school-branding-page__back">
        {t('admin.settings.backToSettings')}
      </Link>

      <PageHeader
        title={t('admin.settings.schoolBranding.title')}
        subtitle={t('admin.settings.schoolBranding.subtitle')}
      />

      {!ready.saveAvailable ? (
        <InfoBanner
          tone="amber"
          icon="⚠"
          title={t('admin.settings.schoolBranding.readOnlyTitle')}
          description={t('admin.settings.schoolBranding.readOnlyDesc')}
        />
      ) : null}

      <div className="school-branding-layout">
        <div className="school-branding-form">
          <article className="school-branding-card">
            <header className="school-branding-card__head">
              <span className="school-branding-card__icon school-branding-card__icon--identity" aria-hidden="true">
                🏫
              </span>
              <div className="school-branding-card__titles">
                <h2 className="school-branding-card__title">{copy.identityTitle}</h2>
                <p className="school-branding-card__desc">{copy.identityDesc}</p>
              </div>
            </header>
            <div className="school-branding-card__body">
              <div className="school-branding-profile-grid">
                <SchoolBrandingTextField
                  id="school-branding-name-ar"
                  label={copy.nameAr}
                  value={draftProfile.schoolNameAr}
                  dir="rtl"
                  error={fieldErrors.schoolNameAr}
                  wide
                  onChange={(value) => updateProfileField('schoolNameAr', value)}
                />
                <SchoolBrandingTextField
                  id="school-branding-name-lat"
                  label={copy.nameLat}
                  value={draftProfile.schoolNameLat}
                  dir="ltr"
                  error={fieldErrors.schoolNameLat}
                  onChange={(value) => updateProfileField('schoolNameLat', value)}
                />
                <SchoolBrandingTextField
                  id="school-branding-short-name"
                  label={copy.shortName}
                  value={draftProfile.schoolShortName}
                  dir="auto"
                  error={fieldErrors.schoolShortName}
                  onChange={(value) => updateProfileField('schoolShortName', value)}
                />
              </div>

              <div className="school-branding-identity-logo">
                <SchoolBrandingLogoField
                  schoolCode={ready.branding.schoolCode}
                  schoolLabel={schoolLabel}
                  logoAvailable={ready.branding.logoAvailable}
                  logoCacheKey={logoCacheKey}
                  previewUrl={logoPreviewUrl}
                  clearLogo={clearLogo}
                  onPreviewUrlChange={setLogoPreviewUrl}
                  onPendingFileChange={setPendingLogoFile}
                  onClearLogoChange={setClearLogo}
                  onError={setLogoError}
                />
                {logoError ? <p className="school-branding-field-error">{logoError}</p> : null}
              </div>
            </div>
          </article>

          <article className="school-branding-card">
            <header className="school-branding-card__head">
              <span className="school-branding-card__icon school-branding-card__icon--contact" aria-hidden="true">
                ☎️
              </span>
              <div className="school-branding-card__titles">
                <h2 className="school-branding-card__title">{copy.contactTitle}</h2>
                <p className="school-branding-card__desc">{copy.contactDesc}</p>
              </div>
            </header>
            <div className="school-branding-card__body">
              <div className="school-branding-profile-grid">
                <SchoolBrandingTextField
                  id="school-branding-street"
                  label={copy.street}
                  value={draftProfile.street}
                  autoComplete="street-address"
                  error={fieldErrors.street}
                  wide
                  onChange={(value) => updateProfileField('street', value)}
                />
                <SchoolBrandingTextField
                  id="school-branding-city"
                  label={copy.city}
                  value={draftProfile.city}
                  autoComplete="address-level2"
                  error={fieldErrors.city}
                  onChange={(value) => updateProfileField('city', value)}
                />
                <SchoolBrandingTextField
                  id="school-branding-phone"
                  label={copy.phone}
                  value={draftProfile.phone}
                  type="tel"
                  dir="ltr"
                  autoComplete="tel"
                  error={fieldErrors.phone}
                  onChange={(value) => updateProfileField('phone', value)}
                />
                <SchoolBrandingTextField
                  id="school-branding-email"
                  label={copy.email}
                  value={draftProfile.email}
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  error={fieldErrors.email}
                  onChange={(value) => updateProfileField('email', value)}
                />
                <SchoolBrandingTextField
                  id="school-branding-website"
                  label={copy.website}
                  value={draftProfile.website}
                  type="url"
                  dir="ltr"
                  autoComplete="url"
                  error={fieldErrors.website}
                  onChange={(value) => updateProfileField('website', value)}
                />
              </div>
            </div>
          </article>

          <article className="school-branding-card">
            <header className="school-branding-card__head">
              <span className="school-branding-card__icon school-branding-card__icon--slogan" aria-hidden="true">
                ✏️
              </span>
              <div className="school-branding-card__titles">
                <h2 className="school-branding-card__title">
                  {t('admin.settings.schoolBranding.slogan.title')}
                </h2>
                <p className="school-branding-card__desc">
                  {t('admin.settings.schoolBranding.slogan.desc')}
                </p>
              </div>
            </header>
            <div className="school-branding-card__body">
              <div className="school-branding-slogan">
                <label className="school-branding-slogan__label" htmlFor="school-branding-slogan-input">
                  {t('admin.settings.schoolBranding.slogan.label')}
                </label>
                <div className="school-branding-slogan__field">
                  <input
                    id="school-branding-slogan-input"
                    type="text"
                    className="school-branding-slogan__input"
                    value={draftSubtitle}
                    maxLength={SCHOOL_BRANDING_WELCOME_SUBTITLE_MAX}
                    placeholder={t('admin.settings.schoolBranding.slogan.placeholder')}
                    onChange={(event) => {
                      setDraftSubtitle(event.target.value);
                      setFieldErrors((prev) => ({ ...prev, welcomeSubtitle: undefined }));
                    }}
                  />
                  <span
                    className={`school-branding-slogan__counter${counterNearLimit ? ' school-branding-slogan__counter--warn' : ''}`}
                  >
                    {draftSubtitle.length}/{SCHOOL_BRANDING_WELCOME_SUBTITLE_MAX}
                  </span>
                </div>
                {fieldErrors.welcomeSubtitle ? (
                  <p className="school-branding-field-error">{fieldErrors.welcomeSubtitle}</p>
                ) : null}
              </div>
            </div>
          </article>

          <article className="school-branding-card">
            <header className="school-branding-card__head">
              <span className="school-branding-card__icon school-branding-card__icon--colors" aria-hidden="true">
                🎨
              </span>
              <div className="school-branding-card__titles">
                <h2 className="school-branding-card__title">{copy.visualTitle}</h2>
                <p className="school-branding-card__desc">{copy.visualDesc}</p>
              </div>
            </header>
            <div className="school-branding-card__body">
              <div className="school-branding-colors">
                <SchoolBrandingColorField
                  label={t('admin.settings.schoolBranding.colors.primary')}
                  value={draftPrimary}
                  error={fieldErrors.primaryColor}
                  onChange={(value) => {
                    setDraftPrimary(value);
                    setFieldErrors((prev) => ({ ...prev, primaryColor: undefined }));
                  }}
                />
                <SchoolBrandingColorField
                  label={t('admin.settings.schoolBranding.colors.secondary')}
                  value={draftSecondary}
                  error={fieldErrors.secondaryColor}
                  onChange={(value) => {
                    setDraftSecondary(value);
                    setFieldErrors((prev) => ({ ...prev, secondaryColor: undefined }));
                  }}
                />
              </div>
            </div>
          </article>
        </div>

        <aside className="school-branding-aside school-branding-aside--stack" aria-label={copy.documentTitle}>
          <div className="school-branding-aside__card">
            <header className="school-branding-aside__head">
              <h2 className="school-branding-aside__title">
                {t('admin.settings.schoolBranding.preview.title')}
              </h2>
              <p className="school-branding-aside__desc">
                {t('admin.settings.schoolBranding.preview.desc')}
              </p>
            </header>
            <div className="school-branding-aside__body">
              <SchoolBrandingPreview
                branding={ready.branding}
                schoolLabel={schoolLabel}
                welcomeSubtitle={draftSubtitle}
                primaryColor={draftPrimary}
                secondaryColor={draftSecondary}
                logoPreviewUrl={logoPreviewUrl}
                logoCacheKey={logoCacheKey}
                clearLogo={clearLogo}
              />
            </div>
            <p className="school-branding-aside__note">
              {t('admin.settings.schoolBranding.preview.readOnlyNote')}
            </p>
          </div>

          <div className="school-branding-aside__card">
            <header className="school-branding-aside__head">
              <h2 className="school-branding-aside__title">{copy.documentTitle}</h2>
              <p className="school-branding-aside__desc">{copy.documentDesc}</p>
            </header>
            <div className="school-branding-aside__body school-branding-aside__body--document">
              <SchoolBrandingDocumentPreview
                branding={ready.branding}
                nameAr={draftProfile.schoolNameAr}
                nameLat={draftProfile.schoolNameLat}
                shortName={draftProfile.schoolShortName}
                street={draftProfile.street}
                city={draftProfile.city}
                phone={draftProfile.phone}
                email={draftProfile.email}
                website={draftProfile.website}
                primaryColor={draftPrimary}
                secondaryColor={draftSecondary}
                logoPreviewUrl={logoPreviewUrl}
                logoCacheKey={logoCacheKey}
                clearLogo={clearLogo}
                sampleTitle={copy.documentSampleTitle}
              />
            </div>
          </div>
        </aside>
      </div>

      <footer className="school-branding-footer">
        <div className="school-branding-footer__inner">
          <div className="school-branding-footer__status">
            {dirty ? (
              <span className="school-branding-footer__dirty">
                {t('admin.settings.schoolBranding.unsavedChanges')}
              </span>
            ) : (
              <span>{t('admin.settings.schoolBranding.noPendingChanges')}</span>
            )}
          </div>
          <div className="school-branding-footer__actions">
            <button
              type="button"
              className="school-branding-btn school-branding-btn--primary"
              disabled={!canSave}
              onClick={() => void handleSave()}
            >
              {saving ? (
                <>
                  <span className="school-branding-btn__spinner" aria-hidden="true" />
                  {t('common.loading')}
                </>
              ) : (
                t('admin.settings.schoolBranding.save')
              )}
            </button>
            <button
              type="button"
              className="school-branding-btn school-branding-btn--ghost"
              onClick={handleCancel}
              disabled={saving}
            >
              {dirty ? t('common.cancel') : t('admin.settings.schoolBranding.back')}
            </button>
            <button
              type="button"
              className="school-branding-btn school-branding-btn--ghost"
              onClick={() => void handleReload()}
              disabled={reloading || saving}
            >
              {reloading ? (
                <>
                  <span className="school-branding-btn__spinner" aria-hidden="true" />
                  {t('common.loading')}
                </>
              ) : (
                t('admin.settings.schoolBranding.reload')
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
