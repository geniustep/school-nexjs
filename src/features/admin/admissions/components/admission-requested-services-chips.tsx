'use client';

import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionRequestedService } from '@/types/admission';
import { sliceRequestedServiceLabels } from '../utils/admission-requested-services';

export function AdmissionRequestedServicesChips({
  services,
  maxVisible = 2,
  emptyLabel,
  compact = false,
}: {
  services: AdmissionRequestedService[] | null | undefined;
  maxVisible?: number;
  emptyLabel?: string;
  compact?: boolean;
}) {
  const t = useT();
  const list = Array.isArray(services) ? services : [];
  const emptyText = emptyLabel ?? t('admin.admissions.requestedServices.noneSelected');

  if (list.length === 0) {
    return (
      <span
        className={cn(
          'admission-requested-services-chips admission-requested-services-chips--empty',
          compact && 'admission-requested-services-chips--compact',
        )}
        data-testid="admission-requested-services-chips"
      >
        {emptyText}
      </span>
    );
  }

  const { visible, remaining } = sliceRequestedServiceLabels(list, maxVisible);

  return (
    <ul
      className={cn(
        'admission-requested-services-chips',
        compact && 'admission-requested-services-chips--compact',
      )}
      data-testid="admission-requested-services-chips"
    >
      {visible.map((service) => (
        <li key={service.id}>
          <span
            className={cn(
              'admission-requested-services-chips__chip',
              service.active === false && 'admission-requested-services-chips__chip--archived',
            )}
            dir="auto"
            title={
              service.active === false
                ? `${service.name} (${t('admin.admissions.requestedServices.archived')})`
                : service.name
            }
          >
            {service.name}
          </span>
        </li>
      ))}
      {remaining > 0 ? (
        <li>
          <span
            className="admission-requested-services-chips__more"
            title={list
              .slice(maxVisible)
              .map((s) => s.name)
              .join(', ')}
          >
            {t('admin.admissions.requestedServices.moreCount', { count: remaining })}
          </span>
        </li>
      ) : null}
    </ul>
  );
}
