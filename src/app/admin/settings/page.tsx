'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/features/auth/session-context';
import { useLocale } from '@/features/i18n/locale-context';
import { useToast } from '@/components/ui/toast';
import { canViewAcademicSetup } from '@/lib/permissions/academic-setup';
import { canViewSchoolBrandingSettings } from '@/lib/permissions/school-branding-settings';
import { canViewAdminRequestTypeSettings } from '@/lib/permissions/admin-request-types-settings';
import { hasPermission } from '@/lib/permissions/permissions';
import {
  fetchFinanceReceiptSettings,
  updateFinanceReceiptSettings,
  type FinanceReceiptSettings,
} from '@/lib/api/finance-receipt-settings';
import type { ReceiptHtmlPrintLang } from '@/lib/utils/finance-receipt-html-print';
import styles from './settings-hub.module.css';

const COPY = {
  ar: {
    eyebrow: 'إعدادات المؤسسة',
    title: 'كل إعدادات مدرستك في مكان واحد',
    subtitle:
      'أدر هوية المؤسسة، بنيتها الأكاديمية، إعدادات التواصل، والمستندات من مساحة واحدة واضحة وآمنة.',
    generalTitle: 'الإعدادات العامة',
    generalSubtitle: 'انتقل مباشرة إلى المجال الذي تريد ضبطه.',
    academicTitle: 'الهيكلة الأكاديمية',
    academicDesc: 'إدارة المستويات والأقسام والمواد وباقي إعدادات التنظيم الأكاديمي.',
    brandingTitle: 'هوية المؤسسة',
    brandingDesc: 'الاسم، الشعار، الألوان ومعلومات المؤسسة الظاهرة في الواجهات والمستندات.',
    requestTypesTitle: 'أنواع الطلبات الإدارية',
    requestTypesDesc: 'إدارة أنواع الطلبات المتاحة للأسرة ومسارها الافتراضي داخل المؤسسة.',
    open: 'فتح الإعدادات',
    documentsTitle: 'الطباعة والمستندات',
    documentsDesc: 'اضبط السلوك الافتراضي للمستندات التي تُطبع من رقيم.',
    receiptTitle: 'لغة وصل الأداء الافتراضية',
    receiptDesc: 'تُستعمل تلقائيًا في وصل HTML A5 عندما لا يتم اختيار لغة صريحة أثناء الطباعة.',
    arabic: 'العربية',
    french: 'Français',
    current: 'الإعداد الحالي',
    save: 'حفظ الإعداد',
    saving: 'جارٍ الحفظ…',
    saved: 'تم حفظ لغة وصل الأداء الافتراضية.',
    loadError: 'تعذر تحميل إعدادات الوصل. حاول مرة أخرى.',
    saveError: 'تعذر حفظ إعداد لغة الوصل.',
    retry: 'إعادة المحاولة',
    loading: 'جارٍ تحميل الإعداد…',
    lockedTitle: 'إعداد محمي',
    lockedDesc: 'تحتاج إلى صلاحية إدارة إعدادات المالية لتغيير لغة وصل الأداء.',
    hint: 'هذا الإعداد لا يغيّر لغة الواجهة، بل لغة الوصل المطبوع فقط.',
  },
  fr: {
    eyebrow: "Paramètres de l’établissement",
    title: 'Tous les réglages de votre école au même endroit',
    subtitle:
      "Gérez l’identité de l’établissement, sa structure académique, la communication et les documents depuis un espace unique.",
    generalTitle: 'Paramètres généraux',
    generalSubtitle: 'Accédez directement au domaine que vous souhaitez configurer.',
    academicTitle: 'Structure académique',
    academicDesc: 'Gérez les niveaux, classes, matières et les paramètres de l’organisation académique.',
    brandingTitle: "Identité de l’établissement",
    brandingDesc: 'Nom, logo, couleurs et informations affichées dans les interfaces et documents.',
    requestTypesTitle: 'Types de demandes administratives',
    requestTypesDesc: 'Gérez les demandes disponibles pour les familles et leur circuit par défaut.',
    open: 'Ouvrir les paramètres',
    documentsTitle: 'Impression et documents',
    documentsDesc: 'Définissez le comportement par défaut des documents imprimés depuis Raqeem.',
    receiptTitle: 'Langue par défaut du reçu de paiement',
    receiptDesc:
      "Cette langue est utilisée automatiquement pour le reçu HTML A5 lorsqu’aucune langue explicite n’est choisie.",
    arabic: 'العربية',
    french: 'Français',
    current: 'Paramètre actuel',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    saved: 'La langue par défaut du reçu a été enregistrée.',
    loadError: 'Impossible de charger les paramètres du reçu. Réessayez.',
    saveError: 'Impossible d’enregistrer la langue du reçu.',
    retry: 'Réessayer',
    loading: 'Chargement du paramètre…',
    lockedTitle: 'Paramètre protégé',
    lockedDesc: 'La permission de gérer les paramètres financiers est requise pour modifier cette langue.',
    hint: "Ce réglage ne change pas la langue de l’interface, seulement celle du reçu imprimé.",
  },
} as const;

export default function AdminSettingsPage() {
  const user = useSession();
  const { locale } = useLocale();
  const toast = useToast();
  const copy = locale === 'fr' ? COPY.fr : COPY.ar;

  const showAcademic = canViewAcademicSetup(user);
  const showBranding = canViewSchoolBrandingSettings(user);
  const showAdminRequestTypes = canViewAdminRequestTypeSettings(user);
  const canManageReceiptSettings = hasPermission(user, 'finance.manage_settings');

  const [settings, setSettings] = useState<FinanceReceiptSettings | null>(null);
  const [draftLanguage, setDraftLanguage] = useState<ReceiptHtmlPrintLang>('ar');
  const [loadingReceiptSettings, setLoadingReceiptSettings] = useState(false);
  const [receiptSettingsError, setReceiptSettingsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!canManageReceiptSettings) return;

    const controller = new AbortController();
    let active = true;
    setLoadingReceiptSettings(true);
    setReceiptSettingsError(false);

    void fetchFinanceReceiptSettings(controller.signal)
      .then((nextSettings) => {
        if (!active) return;
        if (!nextSettings) {
          setReceiptSettingsError(true);
          setSettings(null);
          return;
        }
        setSettings(nextSettings);
        setDraftLanguage(nextSettings.default_language);
      })
      .catch(() => {
        if (!active) return;
        setReceiptSettingsError(true);
        setSettings(null);
      })
      .finally(() => {
        if (active) setLoadingReceiptSettings(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [canManageReceiptSettings, reloadKey]);

  const dirty = settings !== null && draftLanguage !== settings.default_language;

  async function handleSave() {
    if (!canManageReceiptSettings || !settings || !dirty || saving) return;
    setSaving(true);
    try {
      const updated = await updateFinanceReceiptSettings({ default_language: draftLanguage });
      setSettings(updated);
      setDraftLanguage(updated.default_language);
      toast.success(copy.saved);
    } catch {
      toast.error(copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1 className={styles.title}>{copy.title}</h1>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </div>
        <div className={styles.heroMark} aria-hidden="true">
          ⚙
        </div>
      </section>

      <section className={styles.section} aria-labelledby="settings-general-title">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="settings-general-title">{copy.generalTitle}</h2>
            <p>{copy.generalSubtitle}</p>
          </div>
        </div>

        <div className={styles.quickGrid}>
          {showBranding ? (
            <Link href="/admin/settings/school-branding" className={styles.quickCard}>
              <span className={`${styles.quickIcon} ${styles.quickIconBrand}`} aria-hidden="true">
                ✦
              </span>
              <span className={styles.quickCopy}>
                <strong>{copy.brandingTitle}</strong>
                <span>{copy.brandingDesc}</span>
              </span>
              <span className={styles.quickAction}>{copy.open} →</span>
            </Link>
          ) : null}

          {showAdminRequestTypes ? (
            <Link href="/admin/settings/admin-request-types" className={styles.quickCard}>
              <span className={`${styles.quickIcon} ${styles.quickIconRequests}`} aria-hidden="true">
                ◇
              </span>
              <span className={styles.quickCopy}>
                <strong>{copy.requestTypesTitle}</strong>
                <span>{copy.requestTypesDesc}</span>
              </span>
              <span className={styles.quickAction}>{copy.open} →</span>
            </Link>
          ) : null}

          {showAcademic ? (
            <Link href="/admin/settings/academic-setup" className={styles.quickCard}>
              <span className={`${styles.quickIcon} ${styles.quickIconAcademic}`} aria-hidden="true">
                ◫
              </span>
              <span className={styles.quickCopy}>
                <strong>{copy.academicTitle}</strong>
                <span>{copy.academicDesc}</span>
              </span>
              <span className={styles.quickAction}>{copy.open} →</span>
            </Link>
          ) : null}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="settings-documents-title">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="settings-documents-title">{copy.documentsTitle}</h2>
            <p>{copy.documentsDesc}</p>
          </div>
          <span className={styles.sectionBadge}>HTML · A5</span>
        </div>

        <article className={styles.settingCard}>
          <div className={styles.settingTop}>
            <div className={styles.settingIdentity}>
              <span className={styles.receiptIcon} aria-hidden="true">
                🧾
              </span>
              <div>
                <h3>{copy.receiptTitle}</h3>
                <p>{copy.receiptDesc}</p>
              </div>
            </div>
            {settings ? (
              <div className={styles.currentValue}>
                <span>{copy.current}</span>
                <strong>{settings.default_language === 'fr' ? copy.french : copy.arabic}</strong>
              </div>
            ) : null}
          </div>

          {canManageReceiptSettings ? (
            <div className={styles.settingBody}>
              {loadingReceiptSettings ? (
                <div className={styles.loadingRow} role="status">
                  <span className={styles.spinner} aria-hidden="true" />
                  {copy.loading}
                </div>
              ) : receiptSettingsError ? (
                <div className={styles.errorRow} role="alert">
                  <span>{copy.loadError}</span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setReloadKey((value) => value + 1)}
                  >
                    {copy.retry}
                  </button>
                </div>
              ) : settings ? (
                <>
                  <div className={styles.languageSelector} role="group" aria-label={copy.receiptTitle}>
                    <button
                      type="button"
                      className={`${styles.languageOption} ${draftLanguage === 'ar' ? styles.languageOptionActive : ''}`}
                      aria-pressed={draftLanguage === 'ar'}
                      onClick={() => setDraftLanguage('ar')}
                    >
                      <span className={styles.languageCode}>AR</span>
                      <span>
                        <strong>{copy.arabic}</strong>
                        <small>RTL</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.languageOption} ${draftLanguage === 'fr' ? styles.languageOptionActive : ''}`}
                      aria-pressed={draftLanguage === 'fr'}
                      onClick={() => setDraftLanguage('fr')}
                    >
                      <span className={styles.languageCode}>FR</span>
                      <span>
                        <strong>{copy.french}</strong>
                        <small>LTR</small>
                      </span>
                    </button>
                  </div>

                  <div className={styles.settingFooter}>
                    <p>{copy.hint}</p>
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={!dirty || saving}
                      onClick={() => void handleSave()}
                    >
                      {saving ? copy.saving : copy.save}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className={styles.lockedPanel}>
              <span className={styles.lockIcon} aria-hidden="true">
                🔒
              </span>
              <div>
                <strong>{copy.lockedTitle}</strong>
                <p>{copy.lockedDesc}</p>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
