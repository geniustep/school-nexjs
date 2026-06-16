'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import {
  buildFeePlanScopeGroups,
  filterScopeGroupsBySearch,
  formatFeePlanLevelScopeSummary,
  getCycleCheckState,
  reconcileLevelIdsWithGroups,
  sortLevelIdsByGroups,
  toggleCycleSelection,
  toggleLevelSelection,
  type FeePlanScopeCycleGroup,
} from './fee-plan-level-scope';

function CycleCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  label: string;
  id: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      id={id}
      type="checkbox"
      className="fee-plan-level-scope__checkbox"
      checked={checked}
      aria-checked={indeterminate ? 'mixed' : checked}
      onChange={onChange}
      aria-label={label}
    />
  );
}

export function FeePlanLevelScopeSelector({
  groups,
  selectedIds,
  onChange,
  disabled,
  loading,
  error,
}: {
  groups: FeePlanScopeCycleGroup[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
}) {
  const t = useT();
  const rootId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsedCycles, setCollapsedCycles] = useState<Set<number>>(new Set());

  const labels = useMemo(
    () => ({
      selectLevels: t('admin.finance.feePlansWorkspace.selectLevels'),
      allInCycle: (cycleName: string) =>
        t('admin.finance.feePlansWorkspace.levelScopeAllInCycle', { cycle: cycleName }),
      compact: (cycles: number, count: number) =>
        t('admin.finance.feePlansWorkspace.levelScopeCompact', { cycles, count }),
      noScope: t('admin.finance.feePlansWorkspace.noScopeDefined'),
    }),
    [t],
  );

  const sortedSelected = useMemo(
    () => sortLevelIdsByGroups(selectedIds, groups),
    [selectedIds, groups],
  );

  const summary = useMemo(
    () => formatFeePlanLevelScopeSummary(groups, sortedSelected, labels),
    [groups, sortedSelected, labels],
  );

  const filteredGroups = useMemo(
    () => filterScopeGroupsBySearch(groups, search),
    [groups, search],
  );

  const showSearch = groups.reduce((sum, g) => sum + g.levels.length, 0) > 8;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  function applySelection(next: number[]) {
    onChange(sortLevelIdsByGroups(reconcileLevelIdsWithGroups(next, groups), groups));
  }

  function toggleCycleExpanded(cycleId: number) {
    setCollapsedCycles((prev) => {
      const next = new Set(prev);
      if (next.has(cycleId)) next.delete(cycleId);
      else next.add(cycleId);
      return next;
    });
  }

  const triggerLabel = loading
    ? t('common.loading')
    : groups.length === 0
      ? t('admin.finance.feePlansWorkspace.noLevelsHintShort')
      : summary;

  return (
    <div
      className="fee-plan-level-scope"
      ref={rootRef}
      data-testid="fee-plan-level-scope"
    >
      <button
        type="button"
        className="input fee-plan-level-scope__trigger"
        disabled={disabled || loading || groups.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${rootId}-panel`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="fee-plan-level-scope__trigger-text">{triggerLabel}</span>
        <span className="fee-plan-level-scope__trigger-icon" aria-hidden>▾</span>
      </button>

      {error && <span className="form-error">{error}</span>}

      {open && (
        <div
          id={`${rootId}-panel`}
          className="fee-plan-level-scope__panel"
          role="listbox"
          aria-multiselectable="true"
          aria-label={t('admin.finance.feePlansWorkspace.levelScopePanelLabel')}
        >
          {showSearch && (
            <div className="fee-plan-level-scope__search-wrap">
              <input
                type="search"
                className="input fee-plan-level-scope__search"
                placeholder={t('admin.finance.feePlansWorkspace.searchLevels')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t('admin.finance.feePlansWorkspace.searchLevels')}
              />
            </div>
          )}

          <div className="fee-plan-level-scope__actions row">
            {sortedSelected.length > 0 && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => applySelection([])}
              >
                {t('admin.finance.feePlansWorkspace.clearLevelSelection')}
              </button>
            )}
          </div>

          <div className="fee-plan-level-scope__list">
            {filteredGroups.length === 0 ? (
              <p className="muted fee-plan-level-scope__empty">
                {t('admin.finance.feePlansWorkspace.levelScopeNoMatch')}
              </p>
            ) : (
              filteredGroups.map((group) => {
                const cycleState = getCycleCheckState(group, sortedSelected);
                const expanded = !collapsedCycles.has(group.cycle.id);
                const cycleCheckboxId = `${rootId}-cycle-${group.cycle.id}`;
                const selectedInCycle = group.levels.filter((l) =>
                  sortedSelected.includes(l.schoolLevelId),
                ).length;

                return (
                  <section
                    key={group.cycle.id}
                    className="fee-plan-level-scope__cycle"
                    aria-label={group.cycle.name}
                  >
                    <div className="fee-plan-level-scope__cycle-head">
                      <CycleCheckbox
                        id={cycleCheckboxId}
                        checked={cycleState === 'all'}
                        indeterminate={cycleState === 'partial'}
                        label={group.cycle.name}
                        onChange={() =>
                          applySelection(toggleCycleSelection(group, sortedSelected))
                        }
                      />
                      <button
                        type="button"
                        className="fee-plan-level-scope__cycle-toggle"
                        aria-expanded={expanded}
                        onClick={() => toggleCycleExpanded(group.cycle.id)}
                      >
                        <span className="fee-plan-level-scope__cycle-name">{group.cycle.name}</span>
                        <span className="muted fee-plan-level-scope__cycle-count">
                          {t('admin.finance.feePlansWorkspace.levelScopeSelectedCount', {
                            count: selectedInCycle,
                            total: group.levels.length,
                          })}
                        </span>
                      </button>
                    </div>

                    {expanded && (
                      <ul className="fee-plan-level-scope__levels" role="group">
                        {group.levels.map((level) => {
                          const levelId = `${rootId}-level-${level.schoolLevelId}`;
                          const checked = sortedSelected.includes(level.schoolLevelId);
                          return (
                            <li key={level.schoolLevelId}>
                              <label className="fee-plan-level-scope__level" htmlFor={levelId}>
                                <input
                                  id={levelId}
                                  type="checkbox"
                                  className="fee-plan-level-scope__checkbox"
                                  checked={checked}
                                  aria-checked={checked}
                                  onChange={() =>
                                    applySelection(
                                      toggleLevelSelection(level.schoolLevelId, sortedSelected),
                                    )
                                  }
                                />
                                <span>{level.name}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
