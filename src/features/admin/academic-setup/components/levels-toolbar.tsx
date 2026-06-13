'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { IconSearch, IconSlidersHorizontal } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';
import type { LevelGroup } from '../types';
import { uniqueCycles, type LevelFilterMode } from '../utils/level-filters';

const FILTER_MODES: LevelFilterMode[] = [
  'all',
  'with_classes',
  'without_classes',
  'supports_tracks',
  'needs_review',
];

export function LevelsToolbar({ groups }: { groups: LevelGroup[] }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const filter = (searchParams.get('filter') as LevelFilterMode) || 'all';
  const cycleRaw = searchParams.get('cycle');
  const cycleId = cycleRaw ? Number(cycleRaw) : null;

  const cycles = useMemo(() => uniqueCycles(groups), [groups]);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === '') params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const hasActiveFilters =
    Boolean(search.trim()) || filter !== 'all' || cycleId != null;

  return (
    <div
      className="academic-toolbar academic-toolbar--levels academic-setup-levels-toolbar"
      role="search"
    >
      <label className="academic-toolbar__search academic-toolbar__search--leading-icon">
        <span className="academic-toolbar__search-icon" aria-hidden>
          <IconSearch size={18} />
        </span>
        <span className="academic-setup-sr-only">
          {t('admin.academicSetup.levelsSearchPlaceholder')}
        </span>
        <input
          type="search"
          className="input academic-toolbar__search-input"
          placeholder={t('admin.academicSetup.levelsSearchPlaceholder')}
          value={search}
          onChange={(e) => updateParams({ q: e.target.value || null })}
        />
      </label>

      <div className="academic-toolbar__filters academic-toolbar__filters--levels">
        {cycles.length > 1 && (
          <div className="academic-toolbar__filter-field">
            <span className="academic-toolbar__filter-label">
              {t('admin.academicSetup.guided.cycleFilter')}
            </span>
            <select
              className="input academic-toolbar__filter-input"
              value={cycleId ?? ''}
              onChange={(e) =>
                updateParams({ cycle: e.target.value ? e.target.value : null })
              }
              aria-label={t('admin.academicSetup.guided.cycleFilter')}
            >
              <option value="">{t('admin.academicSetup.guided.allCycles')}</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="academic-toolbar__filter-field">
          <span className="academic-toolbar__filter-label">
            <IconSlidersHorizontal size={14} aria-hidden />
            {t('admin.academicSetup.levelsFilterLabel')}
          </span>
          <select
            className="input academic-toolbar__filter-input"
            value={filter}
            onChange={(e) =>
              updateParams({ filter: e.target.value === 'all' ? null : e.target.value })
            }
            aria-label={t('admin.academicSetup.levelsFilterLabel')}
          >
            {FILTER_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {t(`admin.academicSetup.levelsFilter.${mode}`)}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="academic-toolbar__clear"
            onClick={() => updateParams({ q: null, filter: null, cycle: null })}
          >
            {t('admin.academicSetup.levelsFilterClear')}
          </button>
        )}
      </div>
    </div>
  );
}
