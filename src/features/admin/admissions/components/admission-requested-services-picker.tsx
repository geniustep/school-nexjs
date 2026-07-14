'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import type { AdmissionRequestedService } from '@/types/admission';
import { fetchAdmissionRequestedServices } from '../api/admissions-api';
import {
  dedupeRequestedServiceIds,
  normalizeAdmissionRequestedServices,
} from '../utils/admission-requested-services';

export function AdmissionRequestedServicesPicker({
  selectedIds,
  onChange,
  disabled = false,
  catalog: catalogProp,
}: {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  /** When provided, skips internal catalog fetch. */
  catalog?: AdmissionRequestedService[] | null;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [internalCatalog, setInternalCatalog] = useState<AdmissionRequestedService[] | null>(null);
  const [loading, setLoading] = useState(catalogProp == null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const ownsCatalog = catalogProp === undefined;

  useEffect(() => {
    if (!ownsCatalog) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    void (async () => {
      const res = await fetchAdmissionRequestedServices(
        activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined,
      );
      if (cancelled) return;
      if (!res.success || !res.data) {
        setInternalCatalog(null);
        setError(true);
        setLoading(false);
        return;
      }
      setInternalCatalog(normalizeAdmissionRequestedServices(res.data.items));
      setError(false);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ownsCatalog, activeSchoolId, reloadKey]);

  const catalog = ownsCatalog ? internalCatalog : (catalogProp ?? null);
  const selected = dedupeRequestedServiceIds(selectedIds);
  const selectedSet = new Set(selected);

  const toggle = useCallback(
    (id: number) => {
      if (disabled) return;
      const next = selectedSet.has(id)
        ? selected.filter((value) => value !== id)
        : dedupeRequestedServiceIds([...selected, id]);
      onChange(next);
    },
    [disabled, onChange, selected, selectedSet],
  );

  if (ownsCatalog && loading) {
    return (
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
    );
  }

  if (ownsCatalog && error) {
    return (
      <div
        className="admission-requested-services-picker admission-requested-services-picker--error"
        data-testid="admission-requested-services-picker"
        role="alert"
      >
        <p className="muted">{t('admin.admissions.requestedServices.catalogError')}</p>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={disabled}
        >
          {t('admin.admissions.requestedServices.catalogRetry')}
        </button>
      </div>
    );
  }

  if (!catalog || catalog.length === 0) {
    return (
      <div
        className="admission-requested-services-picker admission-requested-services-picker--empty"
        data-testid="admission-requested-services-picker"
      >
        <p className="muted">{t('admin.admissions.requestedServices.catalogEmpty')}</p>
      </div>
    );
  }

  return (
    <div
      className="admission-requested-services-picker"
      data-testid="admission-requested-services-picker"
      role="group"
      aria-label={t('admin.admissions.requestedServices.title')}
    >
      <ul className="admission-requested-services-picker__list">
        {catalog.map((service) => {
          const checked = selectedSet.has(service.id);
          const inactive = service.active === false;
          return (
            <li key={service.id}>
              <label
                className={cn(
                  'admission-requested-services-picker__card',
                  checked && 'admission-requested-services-picker__card--selected',
                  inactive && 'admission-requested-services-picker__card--archived',
                  disabled && 'admission-requested-services-picker__card--disabled',
                )}
              >
                <input
                  type="checkbox"
                  className="admission-requested-services-picker__input"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(service.id)}
                />
                <span className="admission-requested-services-picker__name" dir="auto">
                  {service.name}
                </span>
                {inactive ? (
                  <span className="admission-requested-services-picker__archived muted tiny">
                    {t('admin.admissions.requestedServices.archived')}
                  </span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
