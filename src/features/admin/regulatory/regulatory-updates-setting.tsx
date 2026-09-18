'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useLocale } from '@/features/i18n/locale-context';
import { fetchRegulatorySettings, updateRegulatorySettings } from './api';
import type { RegulatorySettings } from './types';

type UpdatesCopy = {
  title: string;
  enabledDescription: string;
  disabledDescription: string;
  enabled: string;
  disabled: string;
  loading: string;
  loadError: string;
  retry: string;
  saving: string;
  saved: string;
  saveError: string;
  readOnly: string;
};

const COPY: Record<'ar' | 'en' | 'fr' | 'es', UpdatesCopy> = {
  ar: {
    title: 'استقبال التحديثات التنظيمية',
    enabledDescription: 'رقيم يستقبل تلقائيًا التحديثات التنظيمية الجديدة المرتبطة بالسنة الدراسية.',
    disabledDescription: 'استقبال التحديثات التنظيمية متوقف. تبقى المراجع والتقاويم الموجودة محفوظة.',
    enabled: 'مفعّل',
    disabled: 'متوقف',
    loading: 'جارٍ تحميل حالة الاستقبال…',
    loadError: 'تعذر تحميل إعداد استقبال التحديثات التنظيمية.',
    retry: 'إعادة المحاولة',
    saving: 'جارٍ الحفظ…',
    saved: 'تم تحديث إعداد استقبال التحديثات التنظيمية.',
    saveError: 'تعذر تحديث إعداد استقبال التحديثات التنظيمية.',
    readOnly: 'يمكنك عرض الحالة الحالية، لكن لا تملك صلاحية تغييرها.',
  },
  en: {
    title: 'Receive regulatory updates',
    enabledDescription: 'Raqeem automatically receives new regulatory updates related to the school year.',
    disabledDescription: 'Regulatory updates are paused. Existing references and calendars remain preserved.',
    enabled: 'Enabled',
    disabled: 'Paused',
    loading: 'Loading update status…',
    loadError: 'Unable to load the regulatory updates setting.',
    retry: 'Try again',
    saving: 'Saving…',
    saved: 'Regulatory updates setting updated.',
    saveError: 'Unable to update the regulatory updates setting.',
    readOnly: 'You can view the current status, but you cannot change it.',
  },
  fr: {
    title: 'Réception des mises à jour réglementaires',
    enabledDescription: 'Raqeem reçoit automatiquement les nouvelles mises à jour réglementaires liées à l’année scolaire.',
    disabledDescription: 'La réception des mises à jour réglementaires est arrêtée. Les références et calendriers existants sont conservés.',
    enabled: 'Activée',
    disabled: 'Arrêtée',
    loading: 'Chargement de l’état de réception…',
    loadError: 'Impossible de charger le réglage des mises à jour réglementaires.',
    retry: 'Réessayer',
    saving: 'Enregistrement…',
    saved: 'Le réglage des mises à jour réglementaires a été mis à jour.',
    saveError: 'Impossible de mettre à jour le réglage des mises à jour réglementaires.',
    readOnly: 'Vous pouvez consulter l’état actuel, mais vous ne pouvez pas le modifier.',
  },
  es: {
    title: 'Recepción de actualizaciones normativas',
    enabledDescription: 'Raqeem recibe automáticamente las nuevas actualizaciones normativas relacionadas con el curso escolar.',
    disabledDescription: 'La recepción de actualizaciones normativas está detenida. Las referencias y calendarios existentes se conservan.',
    enabled: 'Activada',
    disabled: 'Detenida',
    loading: 'Cargando el estado de recepción…',
    loadError: 'No se pudo cargar el ajuste de actualizaciones normativas.',
    retry: 'Reintentar',
    saving: 'Guardando…',
    saved: 'Se actualizó el ajuste de actualizaciones normativas.',
    saveError: 'No se pudo actualizar el ajuste de actualizaciones normativas.',
    readOnly: 'Puede ver el estado actual, pero no puede cambiarlo.',
  },
};

export function RegulatoryUpdatesSetting({ canManage }: { canManage: boolean }) {
  const { locale } = useLocale();
  const copy = COPY[locale];
  const toast = useToast();
  const [settings, setSettings] = useState<RegulatorySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const response = await fetchRegulatorySettings();
      if (!response.success) {
        setSettings(null);
        setLoadFailed(true);
        return;
      }
      setSettings(response.data);
    } catch {
      setSettings(null);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleToggle = useCallback(async () => {
    if (!settings || saving || !canManage) return;
    const nextEnabled = !settings.updates_enabled;
    setSaving(true);
    try {
      const response = await updateRegulatorySettings(nextEnabled);
      if (!response.success) {
        toast.error(response.error.message || copy.saveError);
        return;
      }
      setSettings(response.data);
      toast.success(copy.saved);
    } catch {
      toast.error(copy.saveError);
    } finally {
      setSaving(false);
    }
  }, [canManage, copy.saveError, copy.saved, saving, settings, toast]);

  const statusLabel = settings?.updates_enabled ? copy.enabled : copy.disabled;
  const description = settings?.updates_enabled
    ? copy.enabledDescription
    : copy.disabledDescription;

  return (
    <section className="regulatory-reference__updates" aria-labelledby="regulatory-updates-title">
      <div className="regulatory-reference__updates-copy">
        <div className="regulatory-reference__updates-heading">
          <h2 id="regulatory-updates-title">{copy.title}</h2>
          {settings ? (
            <span
              className={`regulatory-reference__updates-status ${
                settings.updates_enabled ? 'regulatory-reference__updates-status--enabled' : ''
              }`}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>

        {loading ? (
          <p className="regulatory-reference__updates-muted">{copy.loading}</p>
        ) : loadFailed ? (
          <div className="regulatory-reference__updates-error">
            <span>{copy.loadError}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void loadSettings()}>
              {copy.retry}
            </button>
          </div>
        ) : settings ? (
          <>
            <p>{description}</p>
            {!canManage ? <p className="regulatory-reference__updates-muted">{copy.readOnly}</p> : null}
          </>
        ) : null}
      </div>

      {settings && !loadFailed ? (
        <div className="regulatory-reference__updates-control">
          {saving ? <span className="regulatory-reference__updates-muted">{copy.saving}</span> : null}
          <button
            type="button"
            role="switch"
            aria-checked={settings.updates_enabled}
            aria-label={copy.title}
            className="regulatory-reference__switch"
            disabled={!canManage || saving}
            onClick={() => void handleToggle()}
          >
            <span className="regulatory-reference__switch-thumb" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </section>
  );
}
