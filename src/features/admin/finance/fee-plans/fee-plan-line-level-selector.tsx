'use client';

import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import {
  type FeePlanScopeCycleGroup,
} from './fee-plan-level-scope';
import type { FeePlanLineLevelScopeMode } from './fee-plan-types';

export function FeePlanLineLevelSelector({
  planLevelIds,
  scopeGroups,
  mode,
  selectedLevelIds,
  onModeChange,
  onLevelIdsChange,
}: {
  planLevelIds: number[];
  scopeGroups: FeePlanScopeCycleGroup[];
  mode: FeePlanLineLevelScopeMode;
  selectedLevelIds: number[];
  onModeChange: (mode: FeePlanLineLevelScopeMode) => void;
  onLevelIdsChange: (ids: number[]) => void;
}) {
  const t = useT();

  const planGroups = useMemo(() => {
    if (!planLevelIds.length) return scopeGroups;
    const allowed = new Set(planLevelIds);
    return scopeGroups
      .map((group) => ({
        ...group,
        levels: group.levels.filter((level) => allowed.has(level.schoolLevelId)),
      }))
      .filter((group) => group.levels.length > 0);
  }, [planLevelIds, scopeGroups]);

  const levelOptions = useMemo(
    () => planGroups.flatMap((group) => group.levels),
    [planGroups],
  );

  return (
    <div className="fee-plan-line-level-selector form-stack">
      <label className="checkbox-row">
        <input
          type="radio"
          name="line-level-scope"
          checked={mode === 'all_plan_levels'}
          onChange={() => onModeChange('all_plan_levels')}
        />
        {t('admin.finance.feePlansWorkspace.allPlanLevels')}
      </label>
      <label className="checkbox-row">
        <input
          type="radio"
          name="line-level-scope"
          checked={mode === 'specific'}
          onChange={() => onModeChange('specific')}
        />
        {t('admin.finance.feePlansWorkspace.specificLevels')}
      </label>
      {mode === 'specific' ? (
        <label>
          {t('nav.levels')}
          <select
            className="input"
            multiple
            size={Math.min(6, Math.max(3, levelOptions.length))}
            value={selectedLevelIds.map(String)}
            onChange={(e) => {
              const ids = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
              onLevelIdsChange(ids);
            }}
          >
            {levelOptions.map((level) => (
              <option key={level.schoolLevelId} value={level.schoolLevelId}>
                {level.name}
              </option>
            ))}
          </select>
          <span className="tiny muted">{t('admin.finance.feePlansWorkspace.lineLevelMultiHint')}</span>
        </label>
      ) : null}
    </div>
  );
}

/** Build scoped groups limited to plan level ids. */
export function scopedGroupsForPlan(
  scopeGroups: FeePlanScopeCycleGroup[],
  planLevelIds: number[],
): FeePlanScopeCycleGroup[] {
  if (!planLevelIds.length) return scopeGroups;
  const allowed = new Set(planLevelIds);
  return scopeGroups
    .map((group) => ({
      ...group,
      levels: group.levels.filter((level) => allowed.has(level.schoolLevelId)),
    }))
    .filter((group) => group.levels.length > 0);
}
