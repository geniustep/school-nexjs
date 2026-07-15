'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
  const panelId = useId();
  const moreRef = useRef<HTMLButtonElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMoreOpen(false);
        moreRef.current?.focus();
      }
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      const root = moreRef.current?.closest('.admission-requested-services-chips__more-wrap');
      if (root && !root.contains(target)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [moreOpen]);

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
  const hiddenNames = list.slice(maxVisible).map((s) => s.name);
  const hiddenJoined = hiddenNames.join(', ');
  const moreAria = t('admin.admissions.card.moreServicesAria', { names: hiddenJoined });

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
        <li className="admission-requested-services-chips__more-wrap">
          <button
            ref={moreRef}
            type="button"
            className="admission-requested-services-chips__more"
            aria-expanded={moreOpen}
            aria-controls={panelId}
            aria-label={moreAria}
            title={hiddenJoined}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMoreOpen((open) => !open);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.stopPropagation();
              }
            }}
          >
            {t('admin.admissions.requestedServices.moreCount', { count: remaining })}
          </button>
          {moreOpen ? (
            <div
              id={panelId}
              role="list"
              className="admission-requested-services-chips__popover"
              data-testid="admission-requested-services-more-popover"
            >
              <p className="admission-requested-services-chips__popover-title">
                {t('admin.admissions.card.showAllServices')}
              </p>
              <ul className="admission-requested-services-chips__popover-list">
                {hiddenNames.map((name) => (
                  <li key={name} dir="auto">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </li>
      ) : null}
    </ul>
  );
}
