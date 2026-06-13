'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { Badge, InfoBanner } from '@/components/ui/primitives';
import { ErrorState, LoadingState } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { formatCountLabel } from '@/lib/i18n/count-plural';
import type { ReferenceLevelOption } from '@/types/academic-levels';
import type { InitializeLevelResult } from '@/types/academic-initialize';
import { initializeAcademicSetup } from '../hooks/use-academic-initialize';
import { useLevelOptions } from '../hooks/use-level-options';
import { useSetupReadiness } from '../hooks/use-setup-readiness';
import { useAcademicSetupLists } from '../hooks/use-academic-setup-data';
import { useTrackOptions } from '../hooks/use-tracks';
import { useTeachingAssignments } from '../hooks/use-teaching-assignments';
import {
  ASSIGNMENTS_CTA_HREF,
  CLASSES_SUBJECTS_HREF,
  aggregateInitializeResults,
  AUTO_SETUP_WIZARD_STEPS,
  buildAcademicInitializePayload,
  buildRetryInitializePayload,
  buildReviewPlans,
  filterWizardReferenceLevels,
  groupReferenceLevelsByCycle,
  isLevelAlreadyEnabled,
  isLevelSelectable,
  levelReadinessBadgeKey,
  levelSelectionStatusBadgeKey,
  mapTrackMappingPresentation,
  reconcileSelectedLevelIds,
  selectedLevelsNeedTrackStep,
  validateInitializeTrackSelections,
  type AutoSetupWizardStep,
} from '../utils/academic-initialize';
import { selectableReferenceTracks } from '../utils/level-options';
import { mapInitializeError } from '../utils/api-errors';
import { isAcademicAutoSetupAvailable } from '../utils/academic-auto-setup-availability';

const STEP_ORDER: AutoSetupWizardStep[] = AUTO_SETUP_WIZARD_STEPS;

function AutoSetupStepper({ activeStep }: { activeStep: AutoSetupWizardStep }) {
  const t = useT();
  const labels: Record<AutoSetupWizardStep, string> = {
    levels: t('admin.academicSetup.autoSetup.steps.levels'),
    tracks: t('admin.academicSetup.autoSetup.steps.tracks'),
    review: t('admin.academicSetup.autoSetup.steps.review'),
    execute: t('admin.academicSetup.autoSetup.steps.execute'),
    complete: t('admin.academicSetup.autoSetup.steps.complete'),
  };

  return (
    <ol className="auto-setup-stepper" aria-label={t('admin.academicSetup.autoSetup.stepperLabel')}>
      {STEP_ORDER.map((step, index) => {
        const active = step === activeStep;
        const done = stepIndex(step) < stepIndex(activeStep);
        return (
          <li
            key={step}
            className="auto-setup-stepper__item"
            data-active={active || undefined}
            data-done={done || undefined}
          >
            <span className="auto-setup-stepper__badge">{index + 1}</span>
            <span className="auto-setup-stepper__label">{labels[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function stepIndex(step: AutoSetupWizardStep): number {
  return STEP_ORDER.indexOf(step);
}

function LevelSelectionStep({
  levels,
  cycles,
  selected,
  onToggleLevel,
  onToggleCycle,
}: {
  levels: ReferenceLevelOption[];
  cycles: ReferenceLevelOption['cycle'][];
  selected: Set<number>;
  onToggleLevel: (level: ReferenceLevelOption) => void;
  onToggleCycle: (cycleId: number, select: boolean) => void;
}) {
  const t = useT();
  const grouped = useMemo(
    () => groupReferenceLevelsByCycle(levels, cycles),
    [levels, cycles],
  );

  return (
    <div className="auto-setup-step">
      <p className="auto-setup-step__intro">{t('admin.academicSetup.autoSetup.levelsIntro')}</p>
      <div className="auto-setup-cycle-groups">
        {grouped.map(({ cycle, levels: cycleLevels }) => {
          const selectableLevels = cycleLevels.filter(isLevelSelectable);
          const selectedInCycle = selectableLevels.filter((level) => selected.has(level.id)).length;
          const allSelected =
            selectableLevels.length > 0 && selectedInCycle === selectableLevels.length;
          const availableCount = selectableLevels.length;
          const alreadyEnabledCount = cycleLevels.filter(isLevelAlreadyEnabled).length;

          return (
            <section key={cycle.id} className="auto-setup-cycle-group">
              <header className="auto-setup-cycle-group__header">
                <div>
                  <h3 className="auto-setup-cycle-group__title">{cycle.name}</h3>
                  <p className="tiny muted">
                    {t('admin.academicSetup.autoSetup.cycleLevelCount', { count: cycleLevels.length })}
                  </p>
                  {(availableCount > 0 || alreadyEnabledCount > 0) && (
                    <p className="tiny muted auto-setup-cycle-group__counts">
                      {availableCount > 0
                        ? t('admin.academicSetup.autoSetup.cycleAvailableCount', {
                            count: availableCount,
                          })
                        : null}
                      {availableCount > 0 && alreadyEnabledCount > 0 ? ' · ' : null}
                      {alreadyEnabledCount > 0
                        ? t('admin.academicSetup.autoSetup.cycleAlreadyEnabledCount', {
                            count: alreadyEnabledCount,
                          })
                        : null}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={selectableLevels.length === 0}
                  onClick={() => onToggleCycle(cycle.id, !allSelected)}
                >
                  {allSelected
                    ? t('admin.academicSetup.autoSetup.deselectAvailableLevels')
                    : t('admin.academicSetup.guided.selectCycle')}
                </button>
              </header>
              <ul className="auto-setup-level-list" role="list">
                {cycleLevels.map((level) => {
                  const statusBadgeKey = levelSelectionStatusBadgeKey(level);
                  const readinessKey = levelReadinessBadgeKey(level);
                  const selectable = isLevelSelectable(level);
                  const alreadyEnabled = isLevelAlreadyEnabled(level);
                  const trackCount =
                    level.reference_tracks_count ?? level.reference_tracks?.length ?? 0;
                  const rowClass = [
                    'auto-setup-level-row',
                    selectable ? 'auto-setup-level-row--selectable' : '',
                    alreadyEnabled ? 'auto-setup-level-row--enabled' : '',
                    !selectable && !alreadyEnabled ? 'auto-setup-level-row--locked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  const handleRowClick = () => {
                    if (selectable) onToggleLevel(level);
                  };

                  return (
                    <li key={level.id}>
                      <div
                        className={rowClass}
                        role={selectable ? 'button' : undefined}
                        tabIndex={selectable ? 0 : undefined}
                        onClick={handleRowClick}
                        onKeyDown={(event) => {
                          if (!selectable) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onToggleLevel(level);
                          }
                        }}
                      >
                        <div className="auto-setup-level-row__start">
                          <span className="auto-setup-level-row__control" aria-hidden="true">
                            {alreadyEnabled ? (
                              <span className="auto-setup-level-row__check">✓</span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={selected.has(level.id)}
                                disabled={!selectable}
                                readOnly
                                tabIndex={-1}
                              />
                            )}
                          </span>
                          <div className="auto-setup-level-row__text">
                            <span className="auto-setup-level-row__name">{level.name}</span>
                            <span className="auto-setup-level-row__code ltr-inline">{level.code}</span>
                            {alreadyEnabled && (
                              <span className="auto-setup-level-row__hint tiny muted">
                                {t('admin.academicSetup.autoSetup.alreadyEnabledInSchool')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="auto-setup-level-row__status">
                          {statusBadgeKey && (
                            <Badge tone={alreadyEnabled ? 'green' : 'blue'}>{t(statusBadgeKey)}</Badge>
                          )}
                          {level.supports_tracks && (
                            <Badge tone="blue">
                              {t('admin.academicSetup.autoSetup.supportsTracksBadge', {
                                count: trackCount,
                              })}
                            </Badge>
                          )}
                          {readinessKey && !alreadyEnabled && (
                            <Badge tone="slate">{t(readinessKey)}</Badge>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TrackSelectionStep({
  levels,
  selectedLevelIds,
  trackSelections,
  validationErrors,
  onToggleTrack,
  onSelectAll,
  onClearAll,
}: {
  levels: ReferenceLevelOption[];
  selectedLevelIds: Set<number>;
  trackSelections: Map<number, Set<number>>;
  validationErrors: Set<number>;
  onToggleTrack: (levelId: number, trackId: number) => void;
  onSelectAll: (levelId: number) => void;
  onClearAll: (levelId: number) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const trackLevels = levels.filter(
    (level) => selectedLevelIds.has(level.id) && level.supports_tracks,
  );

  return (
    <div className="auto-setup-step">
      <p className="auto-setup-step__intro">{t('admin.academicSetup.autoSetup.tracksIntro')}</p>
      {trackLevels.length === 0 ? (
        <p className="muted">{t('admin.academicSetup.autoSetup.noTracksRequired')}</p>
      ) : (
        trackLevels.map((level) => {
        const tracks = selectableReferenceTracks(level);
        const selected = trackSelections.get(level.id) ?? new Set<number>();
        const selectableIds = tracks.filter((track) => track.can_enable && !track.enabled).map((t) => t.id);
        const selectedCount = tracks.filter((track) => track.enabled || selected.has(track.id)).length;

        return (
          <section key={level.id} className="auto-setup-track-level">
            <header className="auto-setup-track-level__header">
              <div>
                <h3>{level.name}</h3>
                <p className="tiny muted ltr-inline">{level.code}</p>
              </div>
              <span className="tiny muted">
                {t('admin.academicSetup.guided.selectedTracks', {
                  selected: selectedCount,
                  total: tracks.length,
                  summary: formatCountLabel(t, locale, 'track', selectedCount),
                })}
              </span>
            </header>
            <div className="auto-setup-track-level__actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={selectableIds.length === 0}
                onClick={() => onSelectAll(level.id)}
              >
                {t('admin.academicSetup.guided.selectAllTracks')}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={selectedCount === 0}
                onClick={() => onClearAll(level.id)}
              >
                {t('admin.academicSetup.guided.clearTrackSelection')}
              </button>
            </div>
            <ul className="auto-setup-track-list" role="list">
              {tracks.map((track) => {
                const mapping = mapTrackMappingPresentation(track.mapping_status);
                const checked = track.enabled || selected.has(track.id);
                const canSelect = track.can_enable && !track.enabled;
                return (
                  <li key={track.id}>
                    <label
                      className={`auto-setup-track-row${!canSelect && !track.enabled ? ' auto-setup-track-row--disabled' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={track.enabled || !canSelect}
                        onChange={() => onToggleTrack(level.id, track.id)}
                      />
                      <span className="auto-setup-track-row__main">
                        <strong>{track.name}</strong>
                        {track.code && <span className="tiny muted ltr-inline">{track.code}</span>}
                        <span className="row mt-2" style={{ gap: 6, flexWrap: 'wrap' }}>
                          {track.enabled ? (
                            <Badge tone="green">{t('admin.academicSetup.guided.trackEnabledInSchool')}</Badge>
                          ) : null}
                          {mapping ? <Badge tone={mapping.tone}>{t(mapping.key)}</Badge> : null}
                        </span>
                        {track.track_specific_subjects?.length ? (
                          <p className="tiny muted mt-2">
                            {track.track_specific_subjects.map((subject) => subject.name).join(' · ')}
                          </p>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {validationErrors.has(level.id) && (
              <p className="tiny auto-setup-track-level__error" role="alert">
                {t('admin.academicSetup.guided.selectAtLeastOneTrack')}
              </p>
            )}
          </section>
        );
        })
      )}
    </div>
  );
}

function ReviewStep({
  plans,
  createFirstClasses,
  enableReferenceSubjects,
  onCreateFirstClassesChange,
  onEnableReferenceSubjectsChange,
}: {
  plans: ReturnType<typeof buildReviewPlans>;
  createFirstClasses: boolean;
  enableReferenceSubjects: boolean;
  onCreateFirstClassesChange: (value: boolean) => void;
  onEnableReferenceSubjectsChange: (value: boolean) => void;
}) {
  const t = useT();

  return (
    <div className="auto-setup-step">
      <p className="auto-setup-step__intro">{t('admin.academicSetup.autoSetup.reviewIntro')}</p>
      <div className="auto-setup-options">
        <label className="auto-setup-option">
          <input
            type="checkbox"
            checked={createFirstClasses}
            onChange={(event) => onCreateFirstClassesChange(event.target.checked)}
          />
          <span>
            <strong>{t('admin.academicSetup.autoSetup.createFirstClassesOption')}</strong>
            <span className="tiny muted block">
              {t('admin.academicSetup.autoSetup.createFirstClassesOptionDesc')}
            </span>
          </span>
        </label>
        <label className="auto-setup-option">
          <input
            type="checkbox"
            checked={enableReferenceSubjects}
            onChange={(event) => onEnableReferenceSubjectsChange(event.target.checked)}
          />
          <span>
            <strong>{t('admin.academicSetup.autoSetup.enableSubjectsOption')}</strong>
            <span className="tiny muted block">
              {t('admin.academicSetup.autoSetup.enableSubjectsOptionDesc')}
            </span>
          </span>
        </label>
        <p className="tiny muted">{t('admin.academicSetup.autoSetup.adjustLaterHint')}</p>
      </div>
      <div className="auto-setup-review-plans">
        {plans.map((plan) => (
          <article key={plan.referenceLevelId} className="auto-setup-review-plan">
            <h3>{plan.levelName}</h3>
            {plan.alreadyEnabled && (
              <p className="tiny muted">{t('admin.academicSetup.autoSetup.planAlreadyEnabled')}</p>
            )}
            {!plan.supportsTracks ? (
              <ul>
                {plan.createFirstClass && (
                  <li>{t('admin.academicSetup.autoSetup.planCreateFirstClassGeneric')}</li>
                )}
                {plan.enableSubjects && (
                  <li>
                    {plan.sharedSubjectsCount != null
                      ? t('admin.academicSetup.autoSetup.planEnableSharedSubjects', {
                          count: plan.sharedSubjectsCount,
                        })
                      : t('admin.academicSetup.autoSetup.planEnableSharedSubjectsGeneric')}
                  </li>
                )}
                <li>{t('admin.academicSetup.autoSetup.planNoTracks')}</li>
                <li>{t('admin.academicSetup.autoSetup.planNoTeachers')}</li>
              </ul>
            ) : (
              <ul>
                {plan.tracks.map((track) => (
                  <li key={track.id}>
                    {t('admin.academicSetup.autoSetup.planTrackClass', { track: track.name })}
                  </li>
                ))}
                {plan.enableSubjects && plan.sharedSubjectsCount != null && (
                  <li>
                    {t('admin.academicSetup.autoSetup.planSharedSubjectsCount', {
                      count: plan.sharedSubjectsCount,
                    })}
                  </li>
                )}
                {plan.enableSubjects && (
                  <li>{t('admin.academicSetup.autoSetup.planTrackSubjectsGeneric')}</li>
                )}
                <li>{t('admin.academicSetup.autoSetup.planNoTeachers')}</li>
              </ul>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function ResultLevelCard({
  result,
  levelName,
  onRetry,
  retrying,
}: {
  result: InitializeLevelResult;
  levelName: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const t = useT();

  const levelStatusKey =
    result.status === 'failed'
      ? 'admin.academicSetup.autoSetup.resultLevelFailed'
      : result.status === 'already_enabled'
        ? 'admin.academicSetup.autoSetup.resultLevelAlreadyEnabled'
        : 'admin.academicSetup.autoSetup.resultLevelEnabled';

  return (
    <article className="auto-setup-result-card" data-status={result.status}>
      <h3>{levelName}</h3>
      <p>{t(levelStatusKey, { level: levelName })}</p>
      {result.first_class && (
        <p className="tiny">
          {result.first_class.status === 'created'
            ? t('admin.academicSetup.autoSetup.resultClassCreated', {
                name: result.first_class.name ?? t('admin.academicSetup.autoSetup.resultClassGeneric'),
              })
            : result.first_class.status === 'already_exists'
              ? t('admin.academicSetup.autoSetup.resultClassExists')
              : result.first_class.status === 'failed'
                ? t('admin.academicSetup.autoSetup.resultClassFailed')
                : t('admin.academicSetup.autoSetup.resultClassSkipped')}
        </p>
      )}
      {(result.tracks ?? []).map((track) => (
        <p key={track.reference_track_id} className="tiny">
          {track.status === 'failed'
            ? t('admin.academicSetup.guided.trackFailed')
            : track.status === 'already_enabled'
              ? t('admin.academicSetup.guided.trackAlreadyEnabled')
              : t('admin.academicSetup.guided.trackEnabled')}
          {track.first_class?.status === 'created'
            ? ` · ${t('admin.academicSetup.autoSetup.planCreateFirstClassGeneric')}`
            : ''}
        </p>
      ))}
      {result.shared_subjects && (
        <p className="tiny">
          {t('admin.academicSetup.autoSetup.resultSharedSubjects', {
            enabled: result.shared_subjects.enabled,
            already: result.shared_subjects.already_enabled,
          })}
        </p>
      )}
      {result.error?.code && (
        <p className="tiny auto-setup-result-card__error" role="alert">
          {mapInitializeError(result.error.code, t, result.error.message)}
        </p>
      )}
      {result.status === 'failed' && onRetry && (
        <button type="button" className="btn btn--ghost btn--sm mt-2" disabled={retrying} onClick={onRetry}>
          {retrying ? t('common.saving') : t('admin.academicSetup.autoSetup.retryFailedLevel')}
        </button>
      )}
    </article>
  );
}

export function AutoSetupWizard({ onFinished }: { onFinished?: () => void }) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const optionsState = useLevelOptions(true, { include_enabled: 'true' });
  const readinessState = useSetupReadiness();
  const listsState = useAcademicSetupLists();
  const tracksState = useTrackOptions();
  const assignmentsState = useTeachingAssignments();

  const [step, setStep] = useState<AutoSetupWizardStep>('levels');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [trackSelections, setTrackSelections] = useState<Map<number, Set<number>>>(new Map());
  const [trackValidationErrors, setTrackValidationErrors] = useState<Set<number>>(new Set());
  const [createFirstClasses, setCreateFirstClasses] = useState(true);
  const [enableReferenceSubjects, setEnableReferenceSubjects] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [retryingLevelId, setRetryingLevelId] = useState<number | null>(null);
  const [results, setResults] = useState<InitializeLevelResult[]>([]);
  const [executeError, setExecuteError] = useState<string | null>(null);

  const allLevels = useMemo(
    () => filterWizardReferenceLevels(optionsState.options?.reference_levels ?? []),
    [optionsState.options],
  );
  const cycles = optionsState.options?.cycles ?? [];

  useEffect(() => {
    optionsState.reload();
    readinessState.reload();
  }, [optionsState.reload, readinessState.reload]);

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set(reconcileSelectedLevelIds(allLevels, prev));
      return next.size === prev.size ? prev : next;
    });
  }, [allLevels]);

  const reviewPlans = useMemo(
    () =>
      buildReviewPlans(selected, allLevels, trackSelections, {
        createFirstClasses,
        enableReferenceSubjects,
      }),
    [selected, allLevels, trackSelections, createFirstClasses, enableReferenceSubjects],
  );

  const outcome = useMemo(() => aggregateInitializeResults(results), [results]);

  function refreshAll() {
    optionsState.reload();
    readinessState.reload();
    listsState.reload();
    tracksState.reload();
    assignmentsState.reload();
  }

  function goNext() {
    if (step === 'levels') {
      if (selected.size === 0) {
        toast.error(t('admin.academicSetup.autoSetup.selectAtLeastOneLevel'));
        return;
      }
      if (selectedLevelsNeedTrackStep(selected, allLevels)) {
        setStep('tracks');
      } else {
        setStep('review');
      }
      return;
    }
    if (step === 'tracks') {
      const validation = validateInitializeTrackSelections(selected, allLevels, trackSelections);
      if (!validation.valid) {
        setTrackValidationErrors(new Set(validation.invalidLevelIds));
        return;
      }
      setTrackValidationErrors(new Set());
      setStep('review');
      return;
    }
    if (step === 'review') {
      void runInitialize(buildAcademicInitializePayload(selected, allLevels, trackSelections, {
        createFirstClasses,
        enableReferenceSubjects,
      }));
    }
  }

  function goBack() {
    if (step === 'tracks') setStep('levels');
    else if (step === 'review') {
      setStep(selectedLevelsNeedTrackStep(selected, allLevels) ? 'tracks' : 'levels');
    }
  }

  async function runInitialize(payload: ReturnType<typeof buildAcademicInitializePayload>) {
    if (!isAcademicAutoSetupAvailable(readinessState.data)) {
      setExecuteError(t('admin.academicSetup.autoSetup.unavailable'));
      setStep('execute');
      return;
    }
    setExecuting(true);
    setExecuteError(null);
    setStep('execute');
    const res = await initializeAcademicSetup(payload, activeSchoolId);
    setExecuting(false);

    if (!res.ok) {
      setExecuteError(mapInitializeError(res.error.code, t, res.error.message));
      return;
    }

    setResults(res.data.results);
    refreshAll();
    const agg = aggregateInitializeResults(res.data.results, res.data.summary);
    if (agg.fullSuccess) {
      toast.success(t('admin.academicSetup.autoSetup.executeSuccess'));
    } else if (agg.partialSuccess) {
      toast.show(t('admin.academicSetup.autoSetup.executePartial'), 'info');
    }
    setStep('complete');
    onFinished?.();
  }

  async function retryLevel(levelId: number) {
    setRetryingLevelId(levelId);
    const payload = buildRetryInitializePayload(levelId, allLevels, trackSelections, {
      createFirstClasses,
      enableReferenceSubjects,
    });
    const res = await initializeAcademicSetup(payload, activeSchoolId);
    setRetryingLevelId(null);
    if (!res.ok) {
      toast.error(mapInitializeError(res.error.code, t, res.error.message));
      return;
    }
    setResults((prev) => {
      const map = new Map(prev.map((item) => [item.reference_level_id, item]));
      for (const item of res.data.results) {
        map.set(item.reference_level_id, item);
      }
      return [...map.values()].sort((a, b) => a.reference_level_id - b.reference_level_id);
    });
    refreshAll();
    toast.success(t('admin.academicSetup.autoSetup.retrySuccess'));
  }

  function toggleLevel(level: ReferenceLevelOption) {
    if (!isLevelSelectable(level)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(level.id)) {
        next.delete(level.id);
        setTrackSelections((tracks) => {
          const trackNext = new Map(tracks);
          trackNext.delete(level.id);
          return trackNext;
        });
      } else {
        next.add(level.id);
      }
      return next;
    });
  }

  function toggleCycle(cycleId: number, select: boolean) {
    const ids = allLevels
      .filter((level) => level.cycle.id === cycleId && isLevelSelectable(level))
      .map((level) => level.id);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function toggleTrack(levelId: number, trackId: number) {
    setTrackSelections((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(levelId) ?? []);
      if (set.has(trackId)) set.delete(trackId);
      else set.add(trackId);
      next.set(levelId, set);
      return next;
    });
    setTrackValidationErrors((prev) => {
      const next = new Set(prev);
      next.delete(levelId);
      return next;
    });
  }

  function selectAllTracks(levelId: number) {
    const level = allLevels.find((item) => item.id === levelId);
    if (!level) return;
    const ids = selectableReferenceTracks(level)
      .filter((track) => track.can_enable && !track.enabled)
      .map((track) => track.id);
    setTrackSelections((prev) => {
      const next = new Map(prev);
      next.set(levelId, new Set(ids));
      return next;
    });
  }

  function clearAllTracks(levelId: number) {
    setTrackSelections((prev) => {
      const next = new Map(prev);
      next.set(levelId, new Set());
      return next;
    });
  }

  if (optionsState.loading && !optionsState.options) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (optionsState.error) {
    return <ErrorState error={optionsState.error} onRetry={() => optionsState.reload()} />;
  }

  return (
    <div className="auto-setup-wizard">
      <header className="auto-setup-wizard__header">
        <div>
          <h1 className="admin-section__title">{t('admin.academicSetup.autoSetup.title')}</h1>
          <p className="muted">{t('admin.academicSetup.autoSetup.subtitle')}</p>
        </div>
        <Link href="/admin/settings/academic-setup" className="btn btn--ghost btn--sm">
          {t('admin.academicSetup.autoSetup.backToSetup')}
        </Link>
      </header>

      <AutoSetupStepper activeStep={step} />

      {step === 'levels' && (
        <LevelSelectionStep
          levels={allLevels}
          cycles={cycles}
          selected={selected}
          onToggleLevel={toggleLevel}
          onToggleCycle={toggleCycle}
        />
      )}

      {step === 'tracks' && (
        <TrackSelectionStep
          levels={allLevels}
          selectedLevelIds={selected}
          trackSelections={trackSelections}
          validationErrors={trackValidationErrors}
          onToggleTrack={toggleTrack}
          onSelectAll={selectAllTracks}
          onClearAll={clearAllTracks}
        />
      )}

      {step === 'review' && (
        <ReviewStep
          plans={reviewPlans}
          createFirstClasses={createFirstClasses}
          enableReferenceSubjects={enableReferenceSubjects}
          onCreateFirstClassesChange={setCreateFirstClasses}
          onEnableReferenceSubjectsChange={setEnableReferenceSubjects}
        />
      )}

      {step === 'execute' && (
        <div className="auto-setup-step auto-setup-step--center">
          {executing ? (
            <>
              <LoadingState label={t('admin.academicSetup.autoSetup.executing')} />
              <p className="muted">{t('admin.academicSetup.autoSetup.executingHint')}</p>
            </>
          ) : executeError ? (
            <ErrorState
              error={{ code: 'partial_failure', message: executeError, details: {} }}
              onRetry={() =>
                void runInitialize(
                  buildAcademicInitializePayload(selected, allLevels, trackSelections, {
                    createFirstClasses,
                    enableReferenceSubjects,
                  }),
                )
              }
            />
          ) : null}
        </div>
      )}

      {step === 'complete' && (
        <div className="auto-setup-step">
          {outcome.partialSuccess && !outcome.fullSuccess && (
            <InfoBanner
              tone="amber"
              icon="!"
              title={t('admin.academicSetup.autoSetup.partialTitle')}
              description={t('admin.academicSetup.autoSetup.partialDesc')}
            />
          )}
          {!outcome.partialSuccess && outcome.fullSuccess && (
            <InfoBanner
              tone="green"
              icon="✓"
              title={t('admin.academicSetup.autoSetup.completeTitle')}
              description={t('admin.academicSetup.autoSetup.completeDesc')}
            />
          )}
          <p className="muted">{t('admin.academicSetup.autoSetup.assignmentMissingNext')}</p>
          <div className="auto-setup-results">
            {results.map((result) => {
              const level =
                allLevels.find((item) => item.id === result.reference_level_id) ??
                ({ name: result.code ?? String(result.reference_level_id) } as ReferenceLevelOption);
              return (
                <ResultLevelCard
                  key={result.reference_level_id}
                  result={result}
                  levelName={level.name}
                  onRetry={
                    result.status === 'failed'
                      ? () => void retryLevel(result.reference_level_id)
                      : undefined
                  }
                  retrying={retryingLevelId === result.reference_level_id}
                />
              );
            })}
          </div>
          <div className="auto-setup-complete-actions">
            <Link href={ASSIGNMENTS_CTA_HREF} className="btn btn--primary">
              {t('admin.academicSetup.autoSetup.goToAssignments')}
            </Link>
            <Link href={CLASSES_SUBJECTS_HREF} className="btn btn--ghost">
              {t('admin.academicSetup.autoSetup.viewClassesSubjects')}
            </Link>
          </div>
          <p className="tiny muted">{t('admin.academicSetup.autoSetup.adjustLaterHint')}</p>
        </div>
      )}

      {step !== 'execute' && step !== 'complete' && (
        <footer className="auto-setup-wizard__footer">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={step === 'levels'}
            onClick={goBack}
          >
            {t('common.back')}
          </button>
          <button type="button" className="btn btn--primary" onClick={goNext}>
            {step === 'review'
              ? t('admin.academicSetup.autoSetup.runSetup')
              : t('common.continue')}
          </button>
        </footer>
      )}
    </div>
  );
}

export function AutoSetupUnavailable() {
  const t = useT();
  return (
    <InfoBanner
      tone="amber"
      icon="i"
      title={t('admin.academicSetup.autoSetup.unavailableTitle')}
      description={t('admin.academicSetup.autoSetup.unavailable')}
    />
  );
}
