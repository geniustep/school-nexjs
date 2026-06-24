'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '@/features/admin/school-branding/school-branding-settings.css';
import { Card, InfoBanner, PageHeader } from '@/components/ui/primitives';
import { LoadingState, ErrorState } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { loginSchoolBrand } from '@/lib/login-school-brand';
import { SCHOOL_BRANDING_WELCOME_SUBTITLE_MAX } from '@/features/admin/school-branding/constants';
import { SchoolBrandingLogoField } from '@/features/admin/school-branding/components/school-branding-logo-field';
import { SchoolBrandingColorField } from '@/features/admin/school-branding/components/school-branding-color-field';
import { SchoolBrandingPreview } from '@/features/admin/school-branding/components/school-branding-preview';
import {
  useSchoolBrandingSettings,
  type SchoolBrandingFieldErrors,
  type SchoolBrandingSettingsData,
} from '@/features/admin/school-branding/hooks/use-school-branding-settings';
import {
  isValidSchoolBrandingHexColor,
  normalizeSchoolBrandingHexColor,
  readFileAsBase64,
} from '@/features/admin/school-branding/utils/branding-form';

function applyServerData(
  data: SchoolBrandingSettingsData,
  setters: {
    setDraftSubtitle: (v: string) => void;
    setBaselineSubtitle: (v: string) => void;
    setDraftPrimary: (v: string) => void;
    setBaselinePrimary: (v: string) => void;
    setDraftSecondary: (v: string) => void;
    setBaselineSecondary: (v: string) => void;
    setLogoPreviewUrl: (v: string | null) => void;
    setPendingLogoFile: (v: File | null) => void;
    setClearLogo: (v: boolean) => void;
    setLogoError: (v: string | null) => void;
    setFieldErrors: (v: SchoolBrandingFieldErrors) => void;
    setLogoCacheKey: (v: number) => void;
  },
  revokePreview?: string | null,
) {
  if (revokePreview) URL.revokeObjectURL(revokePreview);
  setters.setDraftSubtitle(data.welcomeSubtitle ?? '');
  setters.setBaselineSubtitle(data.welcomeSubtitle ?? '');
  setters.setDraftPrimary(data.primaryColor ?? '');
  setters.setBaselinePrimary(data.primaryColor ?? '');
  setters.setDraftSecondary(data.secondaryColor ?? '');
  setters.setBaselineSecondary(data.secondaryColor ?? '');
  setters.setLogoPreviewUrl(null);
  setters.setPendingLogoFile(null);
  setters.setClearLogo(false);
  setters.setLogoError(null);
  setters.setFieldErrors({});
  setters.setLogoCacheKey(Date.now());
}

export function SchoolBrandingSettingsPage() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { state, reload, save } = useSchoolBrandingSettings();

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

  useEffect(() => {
    if (!ready) return;
    applyServerData(ready, {
      setDraftSubtitle,
      setBaselineSubtitle,
      setDraftPrimary,
      setBaselinePrimary,
      setDraftSecondary,
      setBaselineSecondary,
      setLogoPreviewUrl,
      setPendingLogoFile,
      setClearLogo,
      setLogoError,
      setFieldErrors,
      setLogoCacheKey,
    }, logoPreviewUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset drafts when server data changes
  }, [ready?.branding.schoolCode, ready?.welcomeSubtitle, ready?.primaryColor, ready?.secondaryColor, ready?.branding.logoAvailable, ready?.source]);

  const schoolLabel = useMemo(() => {
    if (!ready) return '';
    if (ready.branding.fromApi && ready.branding.schoolName) {
      return ready.branding.schoolName;
    }
    return loginSchoolBrand.schoolDisplayName ?? t('auth.hero.schoolNameDefault');
  }, [ready, t]);

  const dirty =
    !!ready &&
    (draftSubtitle.trim() !== baselineSubtitle.trim() ||
      draftPrimary.trim() !== baselinePrimary.trim() ||
      draftSecondary.trim() !== baselineSecondary.trim() ||
      pendingLogoFile !== null ||
      clearLogo);

  function validateClient(): SchoolBrandingFieldErrors {
    const errors: SchoolBrandingFieldErrors = {};
    if (!draftSubtitle.trim()) errors.welcomeSubtitle = t('admin.settings.schoolBranding.slogan.required');
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
      applyServerData(ready, {
        setDraftSubtitle,
        setBaselineSubtitle,
        setDraftPrimary,
        setBaselinePrimary,
        setDraftSecondary,
        setBaselineSecondary,
        setLogoPreviewUrl,
        setPendingLogoFile,
        setClearLogo,
        setLogoError,
        setFieldErrors,
        setLogoCacheKey,
      }, logoPreviewUrl);
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

    const result = await save({
      welcomeSubtitle: draftSubtitle.trim(),
      primaryColor: normalizeSchoolBrandingHexColor(draftPrimary),
      secondaryColor: normalizeSchoolBrandingHexColor(draftSecondary),
      logoBase64: pendingLogoFile ? logoBase64 : undefined,
      clearLogo: clearLogo || undefined,
    });

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

    applyServerData(result.data, {
      setDraftSubtitle,
      setBaselineSubtitle,
      setDraftPrimary,
      setBaselinePrimary,
      setDraftSecondary,
      setBaselineSecondary,
      setLogoPreviewUrl,
      setPendingLogoFile,
      setClearLogo,
      setLogoError,
      setFieldErrors,
      setLogoCacheKey,
    }, logoPreviewUrl);
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

  return (
    <>
      <Link href="/admin/settings" className="school-branding-settings__back">
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

      <div className="school-branding-settings">
        <Card>
          <section className="school-branding-settings__section" aria-labelledby="school-branding-logo-heading">
            <h2 id="school-branding-logo-heading" className="school-branding-settings__section-title">
              {t('admin.settings.schoolBranding.logo.title')}
            </h2>
            <p className="school-branding-settings__section-desc">
              {t('admin.settings.schoolBranding.logo.desc')}
            </p>
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
            {logoError ? <p className="form-error">{logoError}</p> : null}
          </section>
        </Card>

        <Card>
          <section className="school-branding-settings__section" aria-labelledby="school-branding-slogan-heading">
            <h2 id="school-branding-slogan-heading" className="school-branding-settings__section-title">
              {t('admin.settings.schoolBranding.slogan.title')}
            </h2>
            <p className="school-branding-settings__section-desc">
              {t('admin.settings.schoolBranding.slogan.desc')}
            </p>
            <div className="school-branding-slogan col" style={{ gap: 6 }}>
              <label className="col" style={{ gap: 4 }}>
                <span className="tiny muted">{t('admin.settings.schoolBranding.slogan.label')}</span>
                <input
                  type="text"
                  value={draftSubtitle}
                  maxLength={SCHOOL_BRANDING_WELCOME_SUBTITLE_MAX}
                  placeholder={t('admin.settings.schoolBranding.slogan.placeholder')}
                  onChange={(e) => {
                    setDraftSubtitle(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, welcomeSubtitle: undefined }));
                  }}
                />
              </label>
              <span className="school-branding-slogan__counter">
                {draftSubtitle.length}/{SCHOOL_BRANDING_WELCOME_SUBTITLE_MAX}
              </span>
              {fieldErrors.welcomeSubtitle ? (
                <p className="form-error">{fieldErrors.welcomeSubtitle}</p>
              ) : null}
            </div>
          </section>
        </Card>

        <Card>
          <section className="school-branding-settings__section" aria-labelledby="school-branding-colors-heading">
            <h2 id="school-branding-colors-heading" className="school-branding-settings__section-title">
              {t('admin.settings.schoolBranding.colors.title')}
            </h2>
            <p className="school-branding-settings__section-desc">
              {t('admin.settings.schoolBranding.colors.desc')}
            </p>
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
          </section>
        </Card>

        <Card>
          <section className="school-branding-settings__section" aria-labelledby="school-branding-preview-heading">
            <h2 id="school-branding-preview-heading" className="school-branding-settings__section-title">
              {t('admin.settings.schoolBranding.preview.title')}
            </h2>
            <p className="school-branding-settings__section-desc">
              {t('admin.settings.schoolBranding.preview.desc')}
            </p>
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
            <p className="school-branding-settings__readonly-note">
              {t('admin.settings.schoolBranding.preview.readOnlyNote')}
            </p>
          </section>
        </Card>

        <div className="school-branding-settings__actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canSave}
            onClick={() => void handleSave()}
          >
            {saving ? t('common.loading') : t('admin.settings.schoolBranding.save')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={handleCancel} disabled={saving}>
            {dirty ? t('common.cancel') : t('admin.settings.schoolBranding.back')}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => void handleReload()}
            disabled={reloading || saving}
          >
            {reloading ? t('common.loading') : t('admin.settings.schoolBranding.reload')}
          </button>
        </div>
      </div>
    </>
  );
}
