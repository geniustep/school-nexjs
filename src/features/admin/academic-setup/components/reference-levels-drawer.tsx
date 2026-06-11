'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { ReferenceLevelOption } from '@/types/academic-levels';
import type { Level } from '@/types/class';
import { linkLegacySchoolLevel } from '../hooks/use-level-actions';
import {
  enableReferenceLevels,
  useLevelOptions,
} from '../hooks/use-level-options';
import {
  aggregateEnableResults,
  buildEnablePayload,
  filterReferenceLevels,
  groupReferenceLevelsByCycle,
  isReferenceLevelSelectable,
  referenceLevelSubtitle,
  selectableIdsInCycle,
  type LevelFilterMode,
} from '../utils/level-options';
import { mapAcademicSetupApiError, mapEnableLevelError } from '../utils/api-errors';
import {
  referenceLevelBadgeKey,
  resolveReferenceLevelState,
  type LevelLinkStatus,
} from '../utils/level-link-status';
import { SetupDrawer } from './setup-drawer';

function badgeTone(status: LevelLinkStatus): 'green' | 'amber' | 'slate' | 'blue' {
  switch (status) {
    case 'enabled':
      return 'green';
    case 'legacy_unlinked':
      return 'amber';
    case 'legacy_ambiguous':
      return 'slate';
    default:
      return 'blue';
  }
}

export function ReferenceLevelsDrawer({
  open,
  onClose,
  onEnabled,
  schoolLevels = [],
}: {
  open: boolean;
  onClose: () => void;
  onEnabled: (outcome: {
    enabledCount: number;
    newSchoolLevelIds: number[];
    fullSuccess: boolean;
  }) => void;
  schoolLevels?: Level[];
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const [search, setSearch] = useState('');
  const [cycleId, setCycleId] = useState<number | ''>('');
  const [filterMode, setFilterMode] = useState<LevelFilterMode>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [linkingId, setLinkingId] = useState<number | null>(null);
  const [rowErrors, setRowErrors] = useState<Map<number, string>>(new Map());

  const optionsState = useLevelOptions(true, { include_enabled: 'true' });

  useEffect(() => {
    if (!open) {
      setSearch('');
      setCycleId('');
      setFilterMode('all');
      setSelected(new Set());
      setRowErrors(new Map());
      setLinkingId(null);
      return;
    }
    if (!optionsState.options && !optionsState.loading) {
      optionsState.reload();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const optionsLoaded = optionsState.options !== null;
  const allLevels = optionsState.options?.reference_levels ?? [];
  const showLoading = open && optionsState.loading && !optionsLoaded;
  const cycles = optionsState.options?.cycles ?? [];
  const canEnable = optionsState.options?.permissions?.can_enable ?? false;

  const filteredLevels = useMemo(
    () =>
      filterReferenceLevels(allLevels, {
        search,
        cycleId: cycleId === '' ? null : cycleId,
        mode: filterMode,
      }),
    [allLevels, search, cycleId, filterMode],
  );

  const grouped = useMemo(
    () => groupReferenceLevelsByCycle(filteredLevels, cycles),
    [filteredLevels, cycles],
  );

  function toggleLevel(level: ReferenceLevelOption) {
    if (!isReferenceLevelSelectable(level, schoolLevels)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(level.id)) next.delete(level.id);
      else next.add(level.id);
      return next;
    });
  }

  function toggleCycle(cycleRefId: number) {
    const ids = selectableIdsInCycle(allLevels, cycleRefId, schoolLevels);
    if (!ids.length) return;
    setSelected((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function handleLink(level: ReferenceLevelOption) {
    const state = resolveReferenceLevelState(level, schoolLevels);
    if (!state.canLink || state.schoolLevelId == null) return;

    const confirmed = window.confirm(t('admin.academicSetup.guided.linkLevelConfirm'));
    if (!confirmed) return;

    setLinkingId(level.id);
    setRowErrors((prev) => {
      const next = new Map(prev);
      next.delete(level.id);
      return next;
    });

    const res = await linkLegacySchoolLevel(state.schoolLevelId, level.id, activeSchoolId);
    setLinkingId(null);

    if (!res.ok) {
      const msg = mapAcademicSetupApiError(res.error, t, 'level');
      setRowErrors((prev) => new Map(prev).set(level.id, msg));
      toast.error(msg);
      return;
    }

    toast.success(t('admin.academicSetup.guided.linkLevelSuccess'));
    onEnabled({
      enabledCount: 1,
      newSchoolLevelIds: [res.data.item.id],
      fullSuccess: true,
    });
    optionsState.reload();
  }

  async function handleSave() {
    if (!selected.size || saving || !canEnable) return;
    const payloadIds = buildEnablePayload(selected, allLevels, schoolLevels);
    if (!payloadIds.length) return;

    setSaving(true);
    setRowErrors(new Map());

    const res = await enableReferenceLevels(payloadIds, activeSchoolId);
    setSaving(false);

    if (!res.ok) {
      toast.error(mapAcademicSetupApiError(res.error, t, 'level'));
      return;
    }

    const outcome = aggregateEnableResults(res.data.results);
    const errors = new Map<number, string>();
    for (const [refId, msg] of outcome.errorsByRefId) {
      errors.set(refId, mapEnableLevelError(msg, t));
    }
    for (const r of res.data.results) {
      if (r.error?.code) {
        errors.set(r.reference_level_id, mapEnableLevelError(r.error.code, t, r.error.message));
      }
    }
    setRowErrors(errors);

    const stillSelected = new Set(
      [...selected].filter((id) => outcome.failedIds.includes(id)),
    );
    setSelected(stillSelected);

    if (outcome.enabledCount > 0 || outcome.alreadyEnabledCount > 0) {
      onEnabled({
        enabledCount: outcome.enabledCount,
        newSchoolLevelIds: outcome.newSchoolLevelIds,
        fullSuccess: outcome.fullSuccess && outcome.enabledCount > 0,
      });
      optionsState.reload();
    }

    if (outcome.fullSuccess && outcome.failedCount === 0) {
      if (outcome.enabledCount > 0) {
        toast.success(t('admin.academicSetup.guided.levelsEnableFullSuccess'));
      } else if (outcome.alreadyEnabledCount > 0) {
        toast.success(t('admin.academicSetup.guided.levelAlreadyEnabledNotice'));
      }
      setSelected(new Set());
      onClose();
      return;
    }

    if (outcome.partialSuccess) {
      toast.error(
        t('admin.academicSetup.guided.levelsEnabledPartial', {
          success: outcome.enabledCount,
          failed: outcome.failedCount,
        }),
      );
      return;
    }

    if (outcome.failedCount > 0 && outcome.enabledCount === 0) {
      toast.error(t('admin.academicSetup.guided.levelsEnableAllFailed'));
    }
  }

  const selectedCount = selected.size;

  return (
    <SetupDrawer
      open={open}
      title={t('admin.academicSetup.guided.addLevelsTitle')}
      onClose={onClose}
    >
      <p className="muted tiny mb-2">{t('admin.academicSetup.guided.addLevelsDesc')}</p>

      {showLoading && <p className="muted">{t('common.loading')}</p>}

      {optionsState.error && !showLoading && (
        <div className="academic-setup-gap-banner" role="alert">
          <p>{mapAcademicSetupApiError(optionsState.error, t, 'level')}</p>
          <button type="button" className="btn btn--ghost btn--sm mt-2" onClick={() => optionsState.reload()}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {!showLoading && !optionsState.error && optionsLoaded && !allLevels.length && (
        <p className="muted">{t('admin.academicSetup.guided.noReferenceLevels')}</p>
      )}

      {!showLoading && !optionsState.error && optionsLoaded && allLevels.length > 0 && !filteredLevels.length && (
        <p className="muted">{t('admin.academicSetup.guided.noLevelsFilterMatch')}</p>
      )}

      {!showLoading && !optionsState.error && optionsLoaded && allLevels.length > 0 && filteredLevels.length > 0 && (
        <div className="col" style={{ gap: 16 }}>
          {optionsState.loading && (
            <p className="tiny muted" aria-live="polite">
              {t('common.loading')}
            </p>
          )}
          {!canEnable && (
            <div className="academic-setup-gap-banner" role="status">
              {t('admin.academicSetup.guided.cannotEnableLevels')}
            </div>
          )}

          <div className="academic-setup-filters">
            <input
              className="input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.academicSetup.guided.searchLevels')}
              aria-label={t('admin.academicSetup.guided.searchLevels')}
            />
            <select
              className="input"
              value={cycleId === '' ? '' : String(cycleId)}
              onChange={(e) => setCycleId(e.target.value ? Number(e.target.value) : '')}
              aria-label={t('admin.academicSetup.guided.cycleFilter')}
            >
              <option value="">{t('admin.academicSetup.guided.allCycles')}</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as LevelFilterMode)}
              aria-label={t('admin.academicSetup.guided.statusFilter')}
            >
              <option value="all">{t('admin.academicSetup.guided.filterAll')}</option>
              <option value="available">{t('admin.academicSetup.guided.filterAvailable')}</option>
              <option value="enabled">{t('admin.academicSetup.guided.filterEnabled')}</option>
            </select>
          </div>

          {selectedCount > 0 && (
            <p className="tiny">
              {t('admin.academicSetup.guided.selectedCount', { count: selectedCount })}
            </p>
          )}

          {grouped.map(({ cycle, levels }) => {
            const selectable = selectableIdsInCycle(allLevels, cycle.id, schoolLevels).filter((id) =>
              levels.some((l) => l.id === id),
            );
            const allCycleSelected =
              selectable.length > 0 && selectable.every((id) => selected.has(id));

            return (
              <section key={cycle.id} aria-labelledby={`ref-cycle-${cycle.id}`}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <h3 id={`ref-cycle-${cycle.id}`} className="admin-section__title" style={{ margin: 0 }}>
                    {cycle.name}
                  </h3>
                  {canEnable && selectable.length > 0 && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => toggleCycle(cycle.id)}
                    >
                      {allCycleSelected
                        ? t('admin.academicSetup.guided.deselectCycle')
                        : t('admin.academicSetup.guided.selectCycle')}
                    </button>
                  )}
                </div>
                <ul className="academic-setup-ref-levels" role="list">
                  {levels.map((level) => {
                    const state = resolveReferenceLevelState(level, schoolLevels);
                    const selectableLevel = state.canSelect;
                    const checked = selected.has(level.id);
                    const err = rowErrors.get(level.id);
                    const badgeKey = referenceLevelBadgeKey(state.linkStatus);

                    return (
                      <li key={level.id}>
                        <div
                          className={`academic-setup-ref-level${!selectableLevel && state.linkStatus !== 'legacy_unlinked' ? ' academic-setup-ref-level--disabled' : ''}`}
                        >
                          {state.linkStatus === 'legacy_unlinked' ? (
                            <div className="academic-setup-ref-level__main academic-setup-ref-level__main--full">
                              <strong>{level.name}</strong>
                              <span className="tiny muted block">{referenceLevelSubtitle(level)}</span>
                              <span className="tiny muted block">{level.cycle.name}</span>
                              <p className="tiny mt-2">{t('admin.academicSetup.guided.legacyLevelDesc')}</p>
                              <span className="row mt-2" style={{ gap: 6, flexWrap: 'wrap' }}>
                                {badgeKey && <Badge tone={badgeTone(state.linkStatus)}>{t(badgeKey)}</Badge>}
                                {level.supports_tracks && (
                                  <Badge tone="blue">{t('admin.academicSetup.guided.supportsTracks')}</Badge>
                                )}
                              </span>
                              {state.canLink && canEnable && (
                                <button
                                  type="button"
                                  className="btn btn--primary btn--sm mt-2"
                                  disabled={linkingId === level.id || saving}
                                  onClick={() => handleLink(level)}
                                >
                                  {linkingId === level.id
                                    ? t('common.saving')
                                    : t('admin.academicSetup.guided.completeLinkAction')}
                                </button>
                              )}
                            </div>
                          ) : (
                            <label className="academic-setup-ref-level__row">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!selectableLevel || saving || !canEnable}
                                onChange={() => toggleLevel(level)}
                              />
                              <span className="academic-setup-ref-level__main">
                                <strong>{level.name}</strong>
                                <span className="tiny muted block">{referenceLevelSubtitle(level)}</span>
                                <span className="tiny muted block">{level.cycle.name}</span>
                                {state.linkStatus === 'legacy_ambiguous' && (
                                  <p className="tiny mt-2">{t('admin.academicSetup.guided.legacyAmbiguousDesc')}</p>
                                )}
                                <span className="row mt-2" style={{ gap: 6, flexWrap: 'wrap' }}>
                                  {badgeKey && <Badge tone={badgeTone(state.linkStatus)}>{t(badgeKey)}</Badge>}
                                  {level.supports_tracks && (
                                    <Badge tone="blue">{t('admin.academicSetup.guided.supportsTracks')}</Badge>
                                  )}
                                </span>
                              </span>
                            </label>
                          )}
                        </div>
                        {err && (
                          <p className="tiny" style={{ color: '#b91c1c' }}>
                            {err}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          <button
            type="button"
            className="btn btn--primary"
            disabled={!selectedCount || saving || !canEnable}
            onClick={handleSave}
          >
            {saving ? t('common.saving') : t('admin.academicSetup.guided.enableSelectedLevels')}
          </button>
        </div>
      )}
    </SetupDrawer>
  );
}
