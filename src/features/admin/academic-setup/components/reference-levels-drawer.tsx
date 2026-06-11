'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import type { Level } from '@/types/class';
import {
  enableReferenceLevels,
  useLevelOptions,
  type ReferenceLevel,
} from '../hooks/use-reference-levels';
import { aggregateBatchResults, isLevelAlreadyEnabled } from '../utils/guided-flow';
import { mapAcademicSetupApiError } from '../utils/api-errors';
import { SetupDrawer } from './setup-drawer';

const CATEGORY_ORDER = ['preschool', 'primary', 'middle', 'high', 'other'];

function categorySortKey(code: string): number {
  const idx = CATEGORY_ORDER.indexOf(code);
  return idx === -1 ? CATEGORY_ORDER.length : idx;
}

function groupByCategory(levels: ReferenceLevel[]): Map<string, ReferenceLevel[]> {
  const map = new Map<string, ReferenceLevel[]>();
  for (const level of levels) {
    const key = level.category || 'other';
    const list = map.get(key) ?? [];
    list.push(level);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }
  return map;
}

export function ReferenceLevelsDrawer({
  open,
  enabledLevels,
  onClose,
  onEnabled,
}: {
  open: boolean;
  enabledLevels: Level[];
  onClose: () => void;
  onEnabled: (result: { successCount: number; failCount: number }) => void;
}) {
  const t = useT();
  const toast = useToast();
  const optionsState = useLevelOptions();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [partialErrors, setPartialErrors] = useState<Map<number, string>>(new Map());

  const referenceLevels = optionsState.options?.reference_levels ?? [];
  const categories = optionsState.options?.categories ?? [];

  const grouped = useMemo(() => groupByCategory(referenceLevels), [referenceLevels]);
  const sortedCategories = useMemo(
    () =>
      [...grouped.keys()].sort(
        (a, b) => categorySortKey(a) - categorySortKey(b),
      ),
    [grouped],
  );

  function categoryLabel(code: string): string {
    const fromApi = categories.find((c) => c.code === code)?.label;
    if (fromApi) return fromApi;
    const key = `admin.academicSetup.guided.category.${code}`;
    const translated = t(key);
    return translated !== key ? translated : code;
  }

  function displayName(level: ReferenceLevel): string {
    return level.name_ar?.trim() || level.name;
  }

  function toggleLevel(level: ReferenceLevel) {
    if (level.enabled || isLevelAlreadyEnabled(level.code, enabledLevels)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(level.id)) next.delete(level.id);
      else next.add(level.id);
      return next;
    });
  }

  async function handleSave() {
    if (!selected.size || saving) return;
    setSaving(true);
    setPartialErrors(new Map());
    const ids = [...selected];
    const results = await enableReferenceLevels(ids);
    const agg = aggregateBatchResults(results.map((r) => ({ ok: r.ok })));
    const failed = new Map<number, string>();
    const stillSelected = new Set<number>();
    for (const r of results) {
      if (!r.ok) {
        stillSelected.add(r.reference_level_id);
        failed.set(
          r.reference_level_id,
          r.error
            ? mapAcademicSetupApiError(r.error, t, 'level')
            : t('admin.academicSetup.guided.enableFailed'),
        );
      }
    }
    setSaving(false);
    setPartialErrors(failed);
    setSelected(stillSelected);

    if (agg.allOk) {
      toast.success(
        t('admin.academicSetup.guided.levelsEnabledSuccess', { count: agg.successCount }),
      );
      onEnabled(agg);
      onClose();
      return;
    }

    if (agg.successCount > 0) {
      toast.error(
        t('admin.academicSetup.guided.levelsEnabledPartial', {
          success: agg.successCount,
          failed: agg.failCount,
        }),
      );
      onEnabled(agg);
    } else {
      toast.error(t('admin.academicSetup.guided.levelsEnableAllFailed'));
    }
  }

  return (
    <SetupDrawer
      open={open}
      title={t('admin.academicSetup.guided.addLevelsTitle')}
      onClose={onClose}
    >
      {optionsState.loading && <p className="muted">{t('common.loading')}</p>}

      {optionsState.unavailable && (
        <div className="academic-setup-gap-banner" role="alert">
          <strong>{t('admin.academicSetup.guided.levelsApiBlockedTitle')}</strong>
          <p className="tiny mt-2">{t('admin.academicSetup.guided.levelsApiBlockedDesc')}</p>
        </div>
      )}

      {!optionsState.loading && !optionsState.unavailable && !referenceLevels.length && (
        <p className="muted">{t('admin.academicSetup.guided.noReferenceLevels')}</p>
      )}

      {referenceLevels.length > 0 && (
        <div className="col" style={{ gap: 20 }}>
          {sortedCategories.map((category) => (
            <section key={category} aria-labelledby={`ref-cat-${category}`}>
              <h3 id={`ref-cat-${category}`} className="admin-section__title">
                {categoryLabel(category)}
              </h3>
              <ul className="academic-setup-ref-levels" role="list">
                {(grouped.get(category) ?? []).map((level) => {
                  const already =
                    level.enabled || isLevelAlreadyEnabled(level.code, enabledLevels);
                  const checked = selected.has(level.id);
                  const err = partialErrors.get(level.id);
                  return (
                    <li key={level.id}>
                      <label
                        className={`academic-setup-ref-level${already ? ' academic-setup-ref-level--disabled' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={already || saving}
                          onChange={() => toggleLevel(level)}
                        />
                        <span className="academic-setup-ref-level__main">
                          <strong>{displayName(level)}</strong>
                          <span className="tiny muted block">{level.code}</span>
                          {level.supports_tracks && (
                            <Badge tone="blue">{t('admin.academicSetup.guided.supportsTracks')}</Badge>
                          )}
                          {already && (
                            <Badge tone="green">{t('admin.academicSetup.guided.alreadyEnabled')}</Badge>
                          )}
                        </span>
                      </label>
                      {err && <p className="tiny" style={{ color: '#b91c1c' }}>{err}</p>}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <button
            type="button"
            className="btn btn--primary"
            disabled={!selected.size || saving || optionsState.unavailable}
            onClick={handleSave}
          >
            {saving ? t('common.saving') : t('admin.academicSetup.guided.enableSelectedLevels')}
          </button>
        </div>
      )}
    </SetupDrawer>
  );
}
