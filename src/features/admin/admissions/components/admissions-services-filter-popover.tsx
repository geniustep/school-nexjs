'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionRequestedService } from '@/types/admission';

export type AdmissionsServicesFilterValue = {
  requestedServiceIds: string[];
  withoutServices: boolean;
};

export function AdmissionsServicesFilterPopover({
  catalog,
  loading,
  error,
  value,
  onApply,
  onRetry,
}: {
  catalog: AdmissionRequestedService[];
  loading?: boolean;
  error?: boolean;
  value: AdmissionsServicesFilterValue;
  onApply: (next: AdmissionsServicesFilterValue) => void;
  onRetry?: () => void;
}) {
  const t = useT();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>(value.requestedServiceIds);
  const [draftWithout, setDraftWithout] = useState(value.withoutServices);

  useEffect(() => {
    if (!open) return;
    setDraftIds(value.requestedServiceIds);
    setDraftWithout(value.withoutServices);
  }, [open, value.requestedServiceIds, value.withoutServices]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target || !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  const selectedCount = value.requestedServiceIds.length;
  const buttonLabel = value.withoutServices
    ? t('admin.admissions.requestedServices.withoutServices')
    : selectedCount > 0
      ? t('admin.admissions.filters.servicesFilterCount', { count: selectedCount })
      : t('admin.admissions.filters.servicesFilter');

  function toggleService(id: string, checked: boolean) {
    setDraftWithout(false);
    setDraftIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((item) => item !== id);
    });
  }

  function apply() {
    onApply({
      requestedServiceIds: draftWithout ? [] : draftIds,
      withoutServices: draftWithout,
    });
    setOpen(false);
    buttonRef.current?.focus();
  }

  function clear() {
    setDraftIds([]);
    setDraftWithout(false);
    onApply({ requestedServiceIds: [], withoutServices: false });
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div className="admissions-services-filter" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          'input admissions-list-toolbar__state admissions-services-filter__button',
          (selectedCount > 0 || value.withoutServices) &&
            'admissions-services-filter__button--active',
        )}
        aria-expanded={open}
        aria-controls={panelId}
        data-testid="admissions-services-filter-button"
        onClick={() => setOpen((prev) => !prev)}
      >
        {buttonLabel}
      </button>

      {open ? (
        <div
          id={panelId}
          className="admissions-services-filter__panel"
          role="dialog"
          aria-label={t('admin.admissions.filters.servicesFilter')}
          data-testid="admissions-services-filter-panel"
        >
          {loading ? (
            <p className="muted admissions-services-filter__status">
              {t('admin.admissions.requestedServices.catalogLoading')}
            </p>
          ) : error ? (
            <div className="admissions-services-filter__status">
              <p className="muted">{t('admin.admissions.requestedServices.catalogError')}</p>
              {onRetry ? (
                <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
                  {t('admin.admissions.requestedServices.catalogRetry')}
                </button>
              ) : null}
            </div>
          ) : catalog.length === 0 ? (
            <p className="muted admissions-services-filter__status">
              {t('admin.admissions.requestedServices.catalogEmpty')}
            </p>
          ) : (
            <ul className="admissions-services-filter__list">
              <li>
                <label className="admissions-services-filter__option">
                  <input
                    type="checkbox"
                    checked={draftWithout}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setDraftWithout(checked);
                      if (checked) setDraftIds([]);
                    }}
                    data-testid="admissions-services-filter-without"
                  />
                  <span>{t('admin.admissions.requestedServices.withoutServices')}</span>
                </label>
              </li>
              {catalog.map((service) => {
                const id = String(service.id);
                return (
                  <li key={id}>
                    <label className="admissions-services-filter__option">
                      <input
                        type="checkbox"
                        checked={!draftWithout && draftIds.includes(id)}
                        onChange={(e) => toggleService(id, e.target.checked)}
                        data-testid={`admissions-services-filter-option-${id}`}
                      />
                      <span dir="auto">{service.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="admissions-services-filter__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={clear}
              data-testid="admissions-services-filter-clear"
            >
              {t('admin.admissions.filters.servicesFilterClear')}
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={apply}
              disabled={loading}
              data-testid="admissions-services-filter-apply"
            >
              {t('admin.admissions.filters.servicesFilterApply')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
