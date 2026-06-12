'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { ReferenceLevelOption } from '@/types/academic-levels';
import {
  enableReferenceLevels,
  useLevelOptions,
} from '../hooks/use-level-options';
import {
  aggregateEnableResults,
  buildEnableLevelsWithTracksPayload,
  buildEnableOutcomeSections,
  filterReferenceLevels,
  groupReferenceLevelsByCycle,
  isReferenceLevelSelectable,
  referenceLevelSubtitle,
  selectableIdsInCycle,
  selectableTrackIdsForLevel,
  selectedLevelsIncludeNormal,
  selectedLevelsIncludeTracks,
  validateTrackSelections,
  type EnableOutcomeSection,
  type LevelFilterMode,
} from '../utils/level-options';
import { mapAcademicSetupApiError, mapEnableLevelError } from '../utils/api-errors';
import {
  referenceLevelBadgeKey,
  resolveReferenceLevelState,
  type LevelLinkStatus,
} from '../utils/level-link-status';
import { LevelLinkDialog } from './level-link-dialog';
import { ReferenceLevelTrackPanel } from './reference-level-track-panel';
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
  canManageClasses = false,
  onCreateClassForLevel,
}: {
  open: boolean;
  onClose: () => void;
  onEnabled: (outcome: {
    enabledCount: number;
    newSchoolLevelIds: number[];
    fullSuccess: boolean;
    classesCreated?: number;
    createFirstClass?: boolean;
    tracksEnabled?: number;
  }) => void;
  canManageClasses?: boolean;
  onCreateClassForLevel?: (schoolLevelId: number, schoolTrackId?: number) => void;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const firstErrorRef = useRef<HTMLParagraphElement | null>(null);
  const [search, setSearch] = useState('');
  const [cycleId, setCycleId] = useState<number | ''>('');
  const [filterMode, setFilterMode] = useState<LevelFilterMode>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [trackSelections, setTrackSelections] = useState<Map<number, Set<number>>>(new Map());
  const [expandedTrackPanels, setExpandedTrackPanels] = useState<Set<number>>(new Set());
  const [trackValidationErrors, setTrackValidationErrors] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [createFirstClass, setCreateFirstClass] = useState(true);
  const [createFirstClassPerTrack, setCreateFirstClassPerTrack] = useState(true);
  const [outcomeSections, setOutcomeSections] = useState<EnableOutcomeSection[]>([]);
  const [linkTarget, setLinkTarget] = useState<ReferenceLevelOption | null>(null);
  const [rowErrors, setRowErrors] = useState<Map<number, string>>(new Map());

  const optionsState = useLevelOptions(true, { include_enabled: 'true' });

  useEffect(() => {
    if (!open) {
      setSearch('');
      setCycleId('');
      setFilterMode('all');
      setSelected(new Set());
      setTrackSelections(new Map());
      setExpandedTrackPanels(new Set());
      setTrackValidationErrors(new Set());
      setRowErrors(new Map());
      setLinkTarget(null);
      setOutcomeSections([]);
      setCreateFirstClass(true);
      setCreateFirstClassPerTrack(true);
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

  const showCreateFirstClassOption =
    canManageClasses && selectedLevelsIncludeNormal(selected, allLevels);
  const showCreateFirstClassPerTrackOption =
    canManageClasses && selectedLevelsIncludeTracks(selected, allLevels);

  function toggleLevel(level: ReferenceLevelOption) {
    if (!isReferenceLevelSelectable(level)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(level.id)) {
        next.delete(level.id);
        setTrackSelections((tracks) => {
          const trackNext = new Map(tracks);
          trackNext.delete(level.id);
          return trackNext;
        });
        setExpandedTrackPanels((panels) => {
          const panelNext = new Set(panels);
          panelNext.delete(level.id);
          return panelNext;
        });
        setTrackValidationErrors((errors) => {
          const errNext = new Set(errors);
          errNext.delete(level.id);
          return errNext;
        });
      } else {
        next.add(level.id);
        if (level.supports_tracks) {
          setExpandedTrackPanels((panels) => new Set(panels).add(level.id));
        }
      }
      return next;
    });
  }

  function toggleTrack(levelId: number, trackId: number) {
    setTrackSelections((prev) => {
      const next = new Map(prev);
      const current = new Set(next.get(levelId) ?? []);
      if (current.has(trackId)) current.delete(trackId);
      else current.add(trackId);
      next.set(levelId, current);
      return next;
    });
    setTrackValidationErrors((prev) => {
      const next = new Set(prev);
      next.delete(levelId);
      return next;
    });
  }

  function selectAllTracks(level: ReferenceLevelOption) {
    const ids = selectableTrackIdsForLevel(level);
    setTrackSelections((prev) => {
      const next = new Map(prev);
      next.set(level.id, new Set(ids));
      return next;
    });
    setTrackValidationErrors((prev) => {
      const next = new Set(prev);
      next.delete(level.id);
      return next;
    });
  }

  function clearTrackSelection(levelId: number) {
    setTrackSelections((prev) => {
      const next = new Map(prev);
      next.set(levelId, new Set());
      return next;
    });
  }

  function toggleCycle(cycleRefId: number) {
    const ids = selectableIdsInCycle(allLevels, cycleRefId);
    if (!ids.length) return;
    setSelected((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
        setTrackSelections((tracks) => {
          const trackNext = new Map(tracks);
          ids.forEach((id) => trackNext.delete(id));
          return trackNext;
        });
        setExpandedTrackPanels((panels) => {
          const panelNext = new Set(panels);
          ids.forEach((id) => panelNext.delete(id));
          return panelNext;
        });
      } else {
        ids.forEach((id) => next.add(id));
        setExpandedTrackPanels((panels) => {
          const panelNext = new Set(panels);
          ids.forEach((id) => {
            const level = allLevels.find((l) => l.id === id);
            if (level?.supports_tracks) panelNext.add(id);
          });
          return panelNext;
        });
      }
      return next;
    });
  }

  function handleLinkClick(level: ReferenceLevelOption) {
    setRowErrors((prev) => {
      const next = new Map(prev);
      next.delete(level.id);
      return next;
    });
    setLinkTarget(level);
  }

  function handleLinked() {
    onEnabled({ enabledCount: 1, newSchoolLevelIds: [], fullSuccess: true });
    optionsState.reload();
  }

  function handleCreateClassNow(schoolLevelId: number, schoolTrackId?: number) {
    onCreateClassForLevel?.(schoolLevelId, schoolTrackId);
  }

  async function handleSave() {
    if (!selected.size || saving || !canEnable) return;

    const trackValidation = validateTrackSelections(selected, allLevels, trackSelections);
    if (!trackValidation.valid) {
      setTrackValidationErrors(new Set(trackValidation.invalidLevelIds));
      setExpandedTrackPanels((prev) => {
        const next = new Set(prev);
        trackValidation.invalidLevelIds.forEach((id) => next.add(id));
        return next;
      });
      requestAnimationFrame(() => firstErrorRef.current?.focus());
      return;
    }

    const shouldCreateFirstClass = canManageClasses && createFirstClass;
    const shouldCreateFirstClassPerTrack = canManageClasses && createFirstClassPerTrack;
    const payload = buildEnableLevelsWithTracksPayload(selected, allLevels, trackSelections, {
      createFirstClass: shouldCreateFirstClass,
      createFirstClassPerTrack: shouldCreateFirstClassPerTrack,
    });
    if (!payload.reference_level_ids.length) return;

    setSaving(true);
    setRowErrors(new Map());
    setOutcomeSections([]);
    setTrackValidationErrors(new Set());

    const res = await enableReferenceLevels(payload, activeSchoolId);
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

    const sections = buildEnableOutcomeSections(res.data.results, allLevels, {
      createFirstClass: shouldCreateFirstClass,
      createFirstClassPerTrack: shouldCreateFirstClassPerTrack,
    });
    setOutcomeSections(sections);

    if (outcome.enabledCount > 0 || outcome.alreadyEnabledCount > 0) {
      onEnabled({
        enabledCount: outcome.enabledCount,
        newSchoolLevelIds: outcome.newSchoolLevelIds,
        fullSuccess: outcome.fullSuccess,
        classesCreated: outcome.classesCreated,
        createFirstClass: shouldCreateFirstClass || shouldCreateFirstClassPerTrack,
        tracksEnabled: outcome.tracksEnabled,
      });
      optionsState.reload();
    }

    const hasPartialOutcome =
      outcome.failedCount > 0 || outcome.classesFailed > 0 || outcome.tracksFailed > 0;

    if (!hasPartialOutcome) {
      if (outcome.enabledCount > 0) {
        if (outcome.tracksEnabled > 0) {
          toast.success(t('admin.academicSetup.guided.levelsTracksAndClassesCreated'));
        } else if (shouldCreateFirstClass && outcome.classesCreated > 0) {
          toast.success(t('admin.academicSetup.guided.levelsAndClassesCreated'));
        } else if (shouldCreateFirstClass && outcome.classesAlreadyExist > 0) {
          toast.success(t('admin.academicSetup.guided.levelsEnabledWithClassesSkipped'));
        } else if (shouldCreateFirstClass || shouldCreateFirstClassPerTrack) {
          toast.success(t('admin.academicSetup.guided.levelsEnabledWithoutClasses'));
        } else {
          toast.success(t('admin.academicSetup.guided.levelsEnableFullSuccess'));
        }
      } else if (outcome.alreadyEnabledCount > 0) {
        toast.success(t('admin.academicSetup.guided.levelAlreadyEnabledNotice'));
      }
      setSelected(new Set());
      setTrackSelections(new Map());
      setOutcomeSections([]);
      onClose();
      return;
    }

    if (outcome.partialSuccess) {
      toast.error(
        t('admin.academicSetup.guided.levelsEnabledPartial', {
          success: outcome.enabledCount,
          failed: outcome.failedCount + outcome.tracksFailed,
        }),
      );
    } else if (
      (outcome.classesFailed > 0 || outcome.tracksFailed > 0) &&
      outcome.enabledCount > 0
    ) {
      toast.error(t('admin.academicSetup.guided.firstClassPartialFailure'));
    } else if (outcome.failedCount > 0 && outcome.enabledCount === 0) {
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
      <div className="academic-setup-ref-levels-drawer">
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
          <div className="col academic-setup-ref-levels-drawer__content" style={{ gap: 16 }}>
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

            {showCreateFirstClassOption && (
              <label className="academic-setup-ref-level__row">
                <input
                  type="checkbox"
                  checked={createFirstClass}
                  disabled={saving}
                  onChange={(e) => setCreateFirstClass(e.target.checked)}
                />
                <span className="academic-setup-ref-level__main">
                  <strong>{t('admin.academicSetup.guided.createFirstClassAutomatically')}</strong>
                  <span className="tiny muted block">
                    {t('admin.academicSetup.guided.createFirstClassAutomaticallyDescription')}
                  </span>
                </span>
              </label>
            )}

            {showCreateFirstClassPerTrackOption && (
              <label className="academic-setup-ref-level__row">
                <input
                  type="checkbox"
                  checked={createFirstClassPerTrack}
                  disabled={saving}
                  onChange={(e) => setCreateFirstClassPerTrack(e.target.checked)}
                />
                <span className="academic-setup-ref-level__main">
                  <strong>{t('admin.academicSetup.guided.createFirstClassPerTrack')}</strong>
                  <span className="tiny muted block">
                    {t('admin.academicSetup.guided.createFirstClassPerTrackDescription')}
                  </span>
                </span>
              </label>
            )}

            {outcomeSections.length > 0 && (
              <div className="academic-setup-gap-banner" role="status">
                <p className="tiny">{t('admin.academicSetup.guided.enableOutcomeSummaryTitle')}</p>
                <ul className="academic-setup-ref-levels" role="list">
                  {outcomeSections.map((section) => (
                    <li key={section.referenceLevelId} className="academic-setup-ref-level-outcome">
                      <p className="tiny">
                        <strong>{section.levelName}</strong>
                        {' — '}
                        {t(section.levelMessageKey, section.levelMessageVars)}
                      </p>
                      {section.tracks.length > 0 && (
                        <ul className="academic-setup-ref-level-outcome__tracks" role="list">
                          {section.tracks.map((trackLine) => (
                            <li key={trackLine.referenceTrackId} className="row mt-2" style={{ gap: 8, flexWrap: 'wrap' }}>
                              <span className="tiny">
                                <strong>{trackLine.trackName}</strong>
                                {' — '}
                                {t(trackLine.messageKey, trackLine.messageVars)}
                                {trackLine.firstClassMessageKey && (
                                  <>
                                    {' — '}
                                    {t(trackLine.firstClassMessageKey, trackLine.firstClassMessageVars)}
                                  </>
                                )}
                              </span>
                              {trackLine.canCreateClass &&
                                trackLine.schoolLevelId &&
                                onCreateClassForLevel && (
                                  <button
                                    type="button"
                                    className="btn btn--primary btn--sm"
                                    disabled={saving}
                                    onClick={() =>
                                      handleCreateClassNow(
                                        trackLine.schoolLevelId!,
                                        trackLine.schoolTrackId ?? undefined,
                                      )
                                    }
                                  >
                                    {t('admin.academicSetup.guided.createTrackClassNow')}
                                  </button>
                                )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {section.canCreateClass && section.schoolLevelId && onCreateClassForLevel && (
                        <button
                          type="button"
                          className="btn btn--primary btn--sm mt-2"
                          disabled={saving}
                          onClick={() => handleCreateClassNow(section.schoolLevelId!)}
                        >
                          {t('admin.academicSetup.guided.createClassNow')}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {grouped.map(({ cycle, levels }) => {
              const selectable = selectableIdsInCycle(allLevels, cycle.id).filter((id) =>
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
                      const state = resolveReferenceLevelState(level);
                      const selectableLevel = state.canSelect;
                      const checked = selected.has(level.id);
                      const err = rowErrors.get(level.id);
                      const badgeKey = referenceLevelBadgeKey(state.linkStatus);
                      const levelTrackSelections = trackSelections.get(level.id) ?? new Set<number>();
                      const showTrackValidation = trackValidationErrors.has(level.id);

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
                                    disabled={saving}
                                    onClick={() => handleLinkClick(level)}
                                  >
                                    {t('admin.academicSetup.guided.completeLinkAction')}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <>
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
                                      <>
                                        <p className="tiny mt-2">{t('admin.academicSetup.guided.legacyAmbiguousDesc')}</p>
                                        <p className="tiny muted">{t('admin.academicSetup.guided.legacyAmbiguousHelp')}</p>
                                      </>
                                    )}
                                    <span className="row mt-2" style={{ gap: 6, flexWrap: 'wrap' }}>
                                      {badgeKey && <Badge tone={badgeTone(state.linkStatus)}>{t(badgeKey)}</Badge>}
                                      {level.supports_tracks && (
                                        <Badge tone="blue">{t('admin.academicSetup.guided.supportsTracks')}</Badge>
                                      )}
                                    </span>
                                  </span>
                                </label>
                                {checked && level.supports_tracks && (
                                  <ReferenceLevelTrackPanel
                                    level={level}
                                    expanded={expandedTrackPanels.has(level.id)}
                                    selectedTrackIds={levelTrackSelections}
                                    disabled={saving || !canEnable}
                                    showValidationError={showTrackValidation}
                                    onToggleExpanded={() =>
                                      setExpandedTrackPanels((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(level.id)) next.delete(level.id);
                                        else next.add(level.id);
                                        return next;
                                      })
                                    }
                                    onToggleTrack={(trackId) => toggleTrack(level.id, trackId)}
                                    onSelectAll={() => selectAllTracks(level)}
                                    onClearAll={() => clearTrackSelection(level.id)}
                                  />
                                )}
                              </>
                            )}
                          </div>
                          {err && (
                            <p className="tiny" style={{ color: '#b91c1c' }}>
                              {err}
                            </p>
                          )}
                          {showTrackValidation && (
                            <p
                              ref={showTrackValidation && trackValidationErrors.has(level.id) ? firstErrorRef : undefined}
                              className="tiny academic-setup-ref-level__tracks-error"
                              role="alert"
                              tabIndex={-1}
                            >
                              {t('admin.academicSetup.guided.selectAtLeastOneTrack')}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        {!showLoading && !optionsState.error && optionsLoaded && allLevels.length > 0 && filteredLevels.length > 0 && (
          <div className="academic-setup-ref-levels-drawer__footer">
            <button type="button" className="btn btn--ghost" disabled={saving} onClick={onClose}>
              {t('common.cancel')}
            </button>
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
      </div>

      <LevelLinkDialog
        level={linkTarget}
        open={!!linkTarget}
        onClose={() => setLinkTarget(null)}
        onLinked={handleLinked}
      />
    </SetupDrawer>
  );
}
