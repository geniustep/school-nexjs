'use client';

import { StatCard } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionRequestedServiceCount } from '@/types/admission';
import { normalizeRequestedServiceCounts } from '../utils/admission-requested-services';

export function AdmissionsRequestedServicesCountCards({
  requestedServiceCounts,
  anyRequestedServicesCount,
  noRequestedServicesCount,
  loading = false,
  error = false,
  activeRequestedServiceId,
  activeHasRequestedServices,
  onSelectService,
  onSelectAny,
  onSelectNone,
  onClear,
  onRetry,
}: {
  requestedServiceCounts?: AdmissionRequestedServiceCount[] | null;
  anyRequestedServicesCount?: number | null;
  noRequestedServicesCount?: number | null;
  loading?: boolean;
  error?: boolean;
  activeRequestedServiceId?: string;
  activeHasRequestedServices?: 'true' | 'false';
  onSelectService: (serviceId: number) => void;
  onSelectAny: () => void;
  onSelectNone: () => void;
  onClear: () => void;
  onRetry?: () => void;
}) {
  const t = useT();

  if (loading) {
    return (
      <div
        className="admissions-requested-services-counts admissions-requested-services-counts--skeleton"
        data-testid="admissions-requested-services-counts"
        aria-busy="true"
        aria-label={t('admin.admissions.requestedServices.dashboardTitle')}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="admissions-dashboard__kpi-btn admissions-dashboard__kpi-btn--skeleton admissions-dashboard__kpi-btn--secondary"
          >
            <span className="admissions-dashboard__skeleton-bar admissions-dashboard__skeleton-bar--label" />
            <span className="admissions-dashboard__skeleton-bar admissions-dashboard__skeleton-bar--value" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="admissions-requested-services-counts admissions-requested-services-counts--error"
        data-testid="admissions-requested-services-counts"
        role="alert"
      >
        <p className="muted">{t('admin.admissions.requestedServices.dashboardError')}</p>
        {onRetry ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
            {t('admin.admissions.requestedServices.dashboardRetry')}
          </button>
        ) : null}
      </div>
    );
  }

  const counts = normalizeRequestedServiceCounts(requestedServiceCounts);
  const anyCount =
    anyRequestedServicesCount == null || !Number.isFinite(Number(anyRequestedServicesCount))
      ? null
      : Number(anyRequestedServicesCount);
  const noneCount =
    noRequestedServicesCount == null || !Number.isFinite(Number(noRequestedServicesCount))
      ? null
      : Number(noRequestedServicesCount);

  if (counts.length === 0 && anyCount == null && noneCount == null) {
    return null;
  }

  const anyActive = activeHasRequestedServices === 'true';
  const noneActive = activeHasRequestedServices === 'false';

  return (
    <div
      className="admissions-requested-services-counts"
      data-testid="admissions-requested-services-counts"
      role="group"
      aria-label={t('admin.admissions.requestedServices.dashboardTitle')}
    >
      {counts.map((item) => {
        const active = activeRequestedServiceId === String(item.service_id);
        return (
          <button
            key={item.service_id}
            type="button"
            className={cn(
              'admissions-dashboard__kpi-btn',
              'admissions-dashboard__kpi-btn--secondary',
              active && 'admissions-dashboard__kpi-btn--active',
            )}
            aria-pressed={active}
            data-testid={`admissions-requested-service-count-${item.service_id}`}
            onClick={() => {
              if (active) onClear();
              else onSelectService(item.service_id);
            }}
          >
            <StatCard label={item.name} value={item.count} tone="none" />
            {active ? (
              <span className="admissions-dashboard__kpi-clear" aria-hidden="true">
                ×
              </span>
            ) : null}
          </button>
        );
      })}

      {anyCount != null ? (
        <button
          type="button"
          className={cn(
            'admissions-dashboard__kpi-btn',
            'admissions-dashboard__kpi-btn--secondary',
            anyActive && 'admissions-dashboard__kpi-btn--active',
          )}
          aria-pressed={anyActive}
          data-testid="admissions-requested-services-count-any"
          onClick={() => {
            if (anyActive) onClear();
            else onSelectAny();
          }}
        >
          <StatCard
            label={t('admin.admissions.requestedServices.dashboardAny')}
            value={anyCount}
            tone="none"
          />
          {anyActive ? (
            <span className="admissions-dashboard__kpi-clear" aria-hidden="true">
              ×
            </span>
          ) : null}
        </button>
      ) : null}

      {noneCount != null ? (
        <button
          type="button"
          className={cn(
            'admissions-dashboard__kpi-btn',
            'admissions-dashboard__kpi-btn--secondary',
            noneActive && 'admissions-dashboard__kpi-btn--active',
          )}
          aria-pressed={noneActive}
          data-testid="admissions-requested-services-count-none"
          onClick={() => {
            if (noneActive) onClear();
            else onSelectNone();
          }}
        >
          <StatCard
            label={t('admin.admissions.requestedServices.dashboardNone')}
            value={noneCount}
            tone="none"
          />
          {noneActive ? (
            <span className="admissions-dashboard__kpi-clear" aria-hidden="true">
              ×
            </span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}
