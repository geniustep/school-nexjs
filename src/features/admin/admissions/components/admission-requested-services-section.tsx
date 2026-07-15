'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionDetail, AdmissionRequestedService } from '@/types/admission';
import {
  fetchAdmissionRequestedServices,
  patchAdmissionRequestedServices,
} from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import {
  dedupeRequestedServiceIds,
  isAdmissionRequestedServicesLocked,
  mapAdmissionRequestedServicesError,
  normalizeAdmissionRequestedServices,
} from '../utils/admission-requested-services';
import { AdmissionRequestedServicesChips } from './admission-requested-services-chips';
import { AdmissionRequestedServicesPicker } from './admission-requested-services-picker';

export function AdmissionRequestedServicesSection({
  detail,
  canEdit,
  onUpdated,
  variant = 'card',
}: {
  detail: AdmissionDetail;
  canEdit: boolean;
  onUpdated: () => void;
  /** `rail` = compact header/ops placement; `card` = full overview card */
  variant?: 'card' | 'rail';
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const locked = isAdmissionRequestedServicesLocked(detail);
  const editable = canEdit && !locked;
  const isRail = variant === 'rail';

  const currentIds = dedupeRequestedServiceIds(
    detail.requested_service_ids ?? detail.requested_services?.map((s) => s.id) ?? [],
  );
  const currentIdsKey = currentIds.join(',');

  const [editing, setEditing] = useState(false);
  const [draftIds, setDraftIds] = useState<number[]>(currentIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<AdmissionRequestedService[] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogReloadKey, setCatalogReloadKey] = useState(0);
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Prefetch catalog while detail is visible so Edit opens with options (or in-panel loading).
  useEffect(() => {
    if (!editable) return;
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(false);
    void (async () => {
      const res = await fetchAdmissionRequestedServices(
        activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined,
      );
      if (cancelled) return;
      if (!res.success || !res.data) {
        setCatalog(null);
        setCatalogError(true);
        setCatalogLoading(false);
        return;
      }
      setCatalog(normalizeAdmissionRequestedServices(res.data.items));
      setCatalogError(false);
      setCatalogLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [editable, activeSchoolId, catalogReloadKey]);

  useEffect(() => {
    if (!editing) {
      setDraftIds(currentIdsKey ? currentIdsKey.split(',').map(Number) : []);
      setError(null);
    }
  }, [currentIdsKey, editing]);

  useEffect(() => {
    if (!editing || !editorRef.current) return;
    editorRef.current.focus({ preventScroll: true });
  }, [editing]);

  function openEditor() {
    setDraftIds(currentIds);
    setError(null);
    setEditing(true);
  }

  function closeEditor() {
    setEditing(false);
    setDraftIds(currentIds);
    setError(null);
  }

  async function handleSave() {
    if (activeSchoolId == null || locked) return;
    setSaving(true);
    setError(null);
    const res = await patchAdmissionRequestedServices(detail.id, draftIds, {
      active_school_id: activeSchoolId,
    });
    setSaving(false);
    if (res.success) {
      toast.success(t('admin.admissions.requestedServices.saved'));
      setEditing(false);
      onUpdated();
      return;
    }
    const code = typeof res.error?.code === 'string' ? res.error.code : undefined;
    const mapped = mapAdmissionRequestedServicesError(code, t);
    const unknown = t('admin.admissions.requestedServices.errors.unknown');
    const fallback = admissionApiErrorMessage(res.error, t);
    setError(mapped !== unknown ? mapped : fallback || mapped);
  }

  return (
    <section
      className={
        isRail
          ? 'admission-requested-services-section admission-requested-services-section--rail'
          : 'card admissions-overview-card admissions-overview-card--full admission-requested-services-section'
      }
      data-testid="admission-requested-services-section"
    >
      <div className="admission-requested-services-section__head">
        <h2 className={isRail ? 'admission-requested-services-section__title' : 'admissions-overview-card__title'}>
          {t('admin.admissions.requestedServices.title')}
        </h2>
        {editable && !editing ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            data-testid="admission-requested-services-edit"
            onClick={openEditor}
          >
            {t('admin.admissions.requestedServices.edit')}
          </button>
        ) : null}
      </div>

      {!isRail ? (
        <p className="muted tiny admission-requested-services-section__hint">
          {t('admin.admissions.requestedServices.hintNoFinance')}
        </p>
      ) : null}

      {locked ? (
        <p className="muted tiny" data-testid="admission-requested-services-locked-note">
          {t('admin.admissions.requestedServices.lockedNote')}
        </p>
      ) : null}

      {editing && editable ? (
        <div
          ref={editorRef}
          className="admission-requested-services-section__editor"
          data-testid="admission-requested-services-editor"
          role="region"
          aria-label={t('admin.admissions.requestedServices.edit')}
          tabIndex={-1}
        >
          {catalogError ? (
            <div className="admission-requested-services-picker admission-requested-services-picker--error" role="alert">
              <p className="muted">{t('admin.admissions.requestedServices.catalogError')}</p>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setCatalogReloadKey((k) => k + 1)}
              >
                {t('admin.admissions.requestedServices.catalogRetry')}
              </button>
            </div>
          ) : catalogLoading && !catalog ? (
            <div
              className="admission-requested-services-picker admission-requested-services-picker--loading"
              data-testid="admission-requested-services-picker"
              aria-busy="true"
              aria-label={t('admin.admissions.requestedServices.catalogLoading')}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="admission-requested-services-picker__skeleton"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : (
            <AdmissionRequestedServicesPicker
              selectedIds={draftIds}
              onChange={setDraftIds}
              disabled={saving}
              catalog={catalog}
            />
          )}
          {error ? (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          ) : null}
          <div className="admission-requested-services-section__actions">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              data-testid="admission-requested-services-save"
              onClick={() => void handleSave()}
              disabled={saving || catalogLoading || catalogError || !catalog}
            >
              {t('admin.admissions.requestedServices.save')}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              data-testid="admission-requested-services-cancel"
              onClick={closeEditor}
              disabled={saving}
            >
              {t('admin.admissions.requestedServices.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <AdmissionRequestedServicesChips
          services={detail.requested_services}
          maxVisible={isRail ? 4 : 6}
          compact={isRail}
        />
      )}
    </section>
  );
}
