'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import {
  ADMISSION_STATUS_NAV_MORE,
  ADMISSION_STATUS_NAV_PRIMARY,
} from '../utils/admission-workspace';
import {
  resolveApplicationStatusCount,
  resolveOpenAdmissionsCount,
} from '../utils/admissions-dashboard-cards';
import type { AdmissionsDashboard } from '@/types/admission';

const HIGHLIGHT_STATUSES = new Set(['accepted', 'ready_for_registration']);

function statusNavTestId(status: string): string {
  return `admissions-status-nav-${status || 'all'}`;
}

function countForStatus(
  dashboard: AdmissionsDashboard | null | undefined,
  status: string,
): number | null {
  if (!dashboard) return null;
  if (!status) return resolveOpenAdmissionsCount(dashboard);
  return resolveApplicationStatusCount(dashboard, status);
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
  const panelId = useId();
  const moreRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const active = statusFilter.trim();
  const moreActive = (ADMISSION_STATUS_NAV_MORE as readonly string[]).includes(active);
  const moreCount = moreActive ? countForStatus(dashboard, active) : null;

  useEffect(() => {
    if (!moreOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target || !moreRef.current?.contains(target)) {
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

  function renderChip(status: string, options?: { inMore?: boolean }) {
    const selected = active === status;
    const count = countForStatus(dashboard, status);
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
          options?.inMore && 'admissions-status-nav__chip--more-item',
        )}
        onClick={() => {
          onSelect(status);
          setMoreOpen(false);
          if (options?.inMore) moreButtonRef.current?.focus();
        }}
      >
        <span className="admissions-status-nav__label">{label}</span>
        {count != null ? (
          <span className="admissions-status-nav__count">{count}</span>
        ) : null}
      </button>
    );
  }

  const moreLabel = moreActive
    ? t(`admin.admissions.applicationStatus.${active}`)
    : t('admin.admissions.statusNav.more');

  return (
    <nav
      className="admissions-status-nav"
      aria-label={t('admin.admissions.statusNav.navLabel')}
      data-testid="admissions-status-nav"
    >
      <div className="admissions-status-nav__primary" role="list">
        {ADMISSION_STATUS_NAV_PRIMARY.map((status) => renderChip(status))}
      </div>

      <div className="admissions-status-nav__more" ref={moreRef}>
        <button
          ref={moreButtonRef}
          type="button"
          className={cn(
            'admissions-status-nav__chip',
            'admissions-status-nav__more-toggle',
            moreActive && 'admissions-status-nav__chip--active',
          )}
          aria-expanded={moreOpen}
          aria-controls={panelId}
          aria-pressed={moreActive}
          data-testid="admissions-status-nav-more"
          onClick={() => setMoreOpen((open) => !open)}
        >
          <span className="admissions-status-nav__label">
            {moreActive
              ? t('admin.admissions.statusNav.moreCurrent', { status: moreLabel })
              : moreLabel}
          </span>
          {moreCount != null ? (
            <span className="admissions-status-nav__count">{moreCount}</span>
          ) : null}
          <span className="admissions-status-nav__more-caret" aria-hidden="true">
            ▾
          </span>
        </button>
        {moreOpen ? (
          <div
            id={panelId}
            className="admissions-status-nav__more-panel"
            role="group"
            data-testid="admissions-status-nav-more-panel"
          >
            {ADMISSION_STATUS_NAV_MORE.map((status) => renderChip(status, { inMore: true }))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
