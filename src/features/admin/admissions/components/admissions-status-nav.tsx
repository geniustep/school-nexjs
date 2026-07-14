'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import {
  ADMISSION_STATUS_NAV_MORE,
  ADMISSION_STATUS_NAV_PRIMARY,
} from '../utils/admission-workspace';
import { resolveApplicationStatusCount } from '../utils/admissions-dashboard-cards';
import type { AdmissionsDashboard } from '@/types/admission';

const HIGHLIGHT_STATUSES = new Set(['accepted', 'ready_for_registration']);

function statusNavTestId(status: string): string {
  return `admissions-status-nav-${status || 'all'}`;
}

function resolveAllApplicationsCount(
  dashboard: AdmissionsDashboard | null | undefined,
): number | null {
  if (!dashboard) return null;
  if (typeof dashboard.total_open === 'number') return dashboard.total_open;
  const map = dashboard.application_status_counts;
  if (map && typeof map === 'object') {
    const values = Object.values(map).filter((n): n is number => typeof n === 'number');
    if (values.length > 0) return values.reduce((sum, n) => sum + n, 0);
  }
  return null;
}

export function AdmissionsStatusNav({
  statusFilter,
  dashboard,
  onSelect,
}: {
  statusFilter: string;
  dashboard?: AdmissionsDashboard | null;
  onSelect: (status: string) => void;
}) {
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);
  const active = statusFilter.trim();
  const moreActive = (ADMISSION_STATUS_NAV_MORE as readonly string[]).includes(active);

  function countFor(status: string): number | null {
    if (!dashboard) return null;
    if (!status) return resolveAllApplicationsCount(dashboard);
    return resolveApplicationStatusCount(dashboard, status);
  }

  function renderChip(status: string) {
    const selected = active === status;
    const count = countFor(status);
    const label = status
      ? t(`admin.admissions.applicationStatus.${status}`)
      : t('admin.admissions.statusNav.allApplications');
    const highlight = HIGHLIGHT_STATUSES.has(status);

    return (
      <button
        key={status || 'all'}
        type="button"
        aria-pressed={selected}
        data-testid={statusNavTestId(status)}
        className={cn(
          'admissions-status-nav__chip',
          selected && 'admissions-status-nav__chip--active',
          highlight && 'admissions-status-nav__chip--emphasis',
        )}
        onClick={() => onSelect(status)}
      >
        <span className="admissions-status-nav__label">{label}</span>
        {count != null ? (
          <span className="admissions-status-nav__count">{count}</span>
        ) : null}
      </button>
    );
  }

  return (
    <nav
      className="admissions-status-nav"
      aria-label={t('admin.admissions.statusNav.navLabel')}
      data-testid="admissions-status-nav"
    >
      <div className="admissions-status-nav__scroller" role="list">
        {ADMISSION_STATUS_NAV_PRIMARY.map((status) => renderChip(status))}

        <div className="admissions-status-nav__more">
          <button
            type="button"
            className={cn(
              'admissions-status-nav__chip',
              'admissions-status-nav__more-toggle',
              moreActive && 'admissions-status-nav__chip--active',
            )}
            aria-expanded={moreOpen}
            aria-pressed={moreActive}
            data-testid="admissions-status-nav-more"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <span className="admissions-status-nav__label">
              {t('admin.admissions.statusNav.more')}
            </span>
          </button>
          {moreOpen ? (
            <div
              className="admissions-status-nav__more-panel"
              role="group"
              data-testid="admissions-status-nav-more-panel"
            >
              {ADMISSION_STATUS_NAV_MORE.map((status) => renderChip(status))}
            </div>
          ) : moreActive ? (
            <div className="admissions-status-nav__more-inline">
              {renderChip(active)}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
