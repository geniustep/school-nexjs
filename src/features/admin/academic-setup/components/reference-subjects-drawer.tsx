'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { ReferenceSubjectOption } from '@/types/academic-subjects';
import type { Level } from '@/types/class';
import type { SetupReadinessPayload } from '@/types/academic-setup';
import {
  enableReferenceSubjects,
  useSubjectOptions,
} from '../hooks/use-subject-options';
import { useTracksList } from '../hooks/use-tracks';
import {
  aggregateEnableSubjectResults,
  buildEnableSubjectsPayload,
  dedupeReferenceSubjects,
  filterReferenceSubjects,
  isReferenceSubjectSelectable,
  selectableAvailableIds,
  selectableRequiredIds,
  type SubjectFilterMode,
  type SubjectSourceFilter,
} from '../utils/subject-options';
import { mapAcademicSetupApiError, mapEnableSubjectError } from '../utils/api-errors';
import { SetupDrawer } from './setup-drawer';

export function ReferenceSubjectsDrawer({
  open,
  onClose,
  onEnabled,
  level,
  readiness,
  teachersCount = 0,
}: {
  open: boolean;
  onClose: () => void;
  onEnabled: (outcome: {
    enabledCount: number;
    fullSuccess: boolean;
    partialSuccess: boolean;
  }) => void;
  level: Level | null;
  readiness?: SetupReadinessPayload | null;
  teachersCount?: number;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const levelId = level?.id ?? null;
  const supportsTracks = level?.supports_tracks ?? false;

  const [scope, setScope] = useState<'level' | 'track'>('level');
  const [trackId, setTrackId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<SubjectFilterMode>('all');
  const [sourceFilter, setSourceFilter] = useState<SubjectSourceFilter>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<Map<number, string>>(new Map());

  const effectiveTrackId =
    supportsTracks && scope === 'track' && trackId !== '' ? trackId : null;

  const tracksQuery = useMemo(
    () => (levelId != null ? { level_id: levelId, limit: 200 } : undefined),
    [levelId],
  );
  const tracksState = useTracksList(open && supportsTracks ? tracksQuery : undefined);
  const levelTracks = useMemo(
    () => tracksState.tracks.filter((tr) => tr.level.id === levelId),
    [tracksState.tracks, levelId],
  );

  const optionsState = useSubjectOptions(
    open ? levelId : null,
    effectiveTrackId,
    open && levelId != null,
  );

  useEffect(() => {
    if (!open) {
      setScope('level');
      setTrackId('');
      setSearch('');
      setFilterMode('all');
      setSourceFilter('all');
      setSelected(new Set());
      setRowErrors(new Map());
      return;
    }
    if (open && levelId && !optionsState.options && !optionsState.loading) {
      optionsState.reload();
    }
  }, [open, levelId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setRowErrors(new Map());
  }, [levelId, effectiveTrackId, open]);

  const optionsLoaded = optionsState.options !== null;
  const allSubjects = useMemo(
    () => dedupeReferenceSubjects(optionsState.options?.reference_subjects ?? []),
    [optionsState.options?.reference_subjects],
  );
  const showLoading = open && optionsState.loading && !optionsLoaded;
  const canEnable = optionsState.options?.permissions?.can_enable ?? false;

  const filteredSubjects = useMemo(
    () =>
      filterReferenceSubjects(allSubjects, {
        search,
        mode: filterMode,
        source: sourceFilter,
      }),
    [allSubjects, search, filterMode, sourceFilter],
  );

  const assignmentMissingCount = useMemo(
    () =>
      (readiness?.issues ?? []).filter(
        (i) => i.code === 'assignment_missing' && i.blocking,
      ).length,
    [readiness?.issues],
  );

  function toggleSubject(subject: ReferenceSubjectOption) {
    if (!isReferenceSubjectSelectable(subject)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(subject.id)) next.delete(subject.id);
      else next.add(subject.id);
      return next;
    });
  }

  function selectAllAvailable() {
    setSelected(new Set(selectableAvailableIds(allSubjects)));
  }

  function selectRequiredOnly() {
    setSelected(new Set(selectableRequiredIds(allSubjects)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleSave() {
    if (!selected.size || saving || !canEnable || levelId == null) return;
    const payloadIds = buildEnableSubjectsPayload(selected, allSubjects);
    if (!payloadIds.length) return;

    setSaving(true);
    setRowErrors(new Map());

    const res = await enableReferenceSubjects(
      {
        level_id: levelId,
        ...(effectiveTrackId != null ? { track_id: effectiveTrackId } : {}),
        reference_subject_ids: payloadIds,
      },
      activeSchoolId,
    );
    setSaving(false);

    if (!res.ok) {
      toast.error(mapAcademicSetupApiError(res.error, t, 'subject'));
      return;
    }

    const outcome = aggregateEnableSubjectResults(res.data.results);
    const errors = new Map<number, string>();
    for (const [refId, msg] of outcome.errorsByRefId) {
      errors.set(refId, mapEnableSubjectError(msg, t));
    }
    for (const r of res.data.results) {
      if (r.error?.code) {
        errors.set(
          r.reference_subject_id,
          mapEnableSubjectError(r.error.code, t, r.error.message),
        );
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
        fullSuccess: outcome.fullSuccess && outcome.enabledCount > 0,
        partialSuccess: outcome.partialSuccess,
      });
      optionsState.reload();
    }

    if (outcome.fullSuccess && outcome.failedCount === 0) {
      if (outcome.enabledCount > 0) {
        toast.success(t('admin.academicSetup.guided.subjectsEnableFullSuccess'));
      } else if (outcome.alreadyEnabledCount > 0) {
        toast.success(t('admin.academicSetup.guided.subjectAlreadyEnabledNotice'));
      }
      setSelected(new Set());
      onClose();
      return;
    }

    if (outcome.partialSuccess) {
      toast.error(
        t('admin.academicSetup.guided.subjectsEnabledPartial', {
          success: outcome.enabledCount,
          failed: outcome.failedCount,
        }),
      );
      return;
    }

    if (outcome.failedCount > 0 && outcome.enabledCount === 0) {
      toast.error(t('admin.academicSetup.guided.subjectsEnableAllFailed'));
    }
  }

  const selectedCount = selected.size;
  const levelTitle = level?.name ?? optionsState.options?.level?.name ?? '';

  const nextStepHref = teachersCount > 0
    ? '/admin/settings/academic-setup/assignments'
    : '/admin/settings/academic-setup/teachers?action=add';
  const nextStepLabel = teachersCount > 0
    ? t('admin.academicSetup.guided.nextStepAssignments')
    : t('admin.academicSetup.guided.nextStepAddTeachers');

  return (
    <SetupDrawer
      open={open}
      title={t('admin.academicSetup.guided.enableSubjectsTitle', { level: levelTitle })}
      onClose={onClose}
    >
      <p className="muted tiny mb-2">{t('admin.academicSetup.guided.enableSubjectsDesc')}</p>

      {showLoading && <p className="muted">{t('common.loading')}</p>}

      {optionsState.error && !showLoading && (
        <div className="academic-setup-gap-banner" role="alert">
          <p>{mapAcademicSetupApiError(optionsState.error, t, 'subject')}</p>
          <button
            type="button"
            className="btn btn--ghost btn--sm mt-2"
            onClick={() => optionsState.reload()}
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {!showLoading && !optionsState.error && optionsLoaded && !allSubjects.length && (
        <p className="muted">{t('admin.academicSetup.guided.noReferenceSubjects')}</p>
      )}

      {!showLoading && !optionsState.error && optionsLoaded && allSubjects.length > 0 && (
        <div className="col" style={{ gap: 16 }}>
          {!canEnable && (
            <div className="academic-setup-gap-banner" role="status">
              {t('admin.academicSetup.guided.cannotEnableSubjects')}
            </div>
          )}

          {supportsTracks && levelTracks.length > 0 && (
            <div className="col" style={{ gap: 8 }}>
              <span className="tiny muted">{t('admin.academicSetup.guided.subjectScope')}</span>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn btn--sm ${scope === 'level' ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => {
                    setScope('level');
                    setTrackId('');
                  }}
                >
                  {t('admin.academicSetup.guided.levelSubjectsShared')}
                </button>
                <button
                  type="button"
                  className={`btn btn--sm ${scope === 'track' ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => setScope('track')}
                >
                  {t('admin.academicSetup.guided.trackSubjectsSpecific')}
                </button>
              </div>
              {scope === 'track' && (
                <label className="col" style={{ gap: 6 }}>
                  <span className="tiny muted">{t('admin.academicSetup.guided.selectTrack')}</span>
                  <select
                    className="input"
                    value={trackId === '' ? '' : String(trackId)}
                    onChange={(e) =>
                      setTrackId(e.target.value ? Number(e.target.value) : '')
                    }
                  >
                    <option value="">{t('admin.academicSetup.guided.chooseTrack')}</option>
                    {levelTracks.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.name} {tr.code ? `(${tr.code})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {scope === 'track' && supportsTracks && trackId === '' && (
            <p className="muted tiny">{t('admin.academicSetup.guided.chooseTrackHint')}</p>
          )}

          {(scope === 'level' || (scope === 'track' && trackId !== '')) && (
            <>
              <div className="academic-setup-filters">
                <input
                  className="input"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('admin.academicSetup.guided.searchSubjects')}
                  aria-label={t('admin.academicSetup.guided.searchSubjects')}
                />
                <select
                  className="input"
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as SubjectFilterMode)}
                  aria-label={t('admin.academicSetup.guided.statusFilter')}
                >
                  <option value="all">{t('admin.academicSetup.guided.filterAll')}</option>
                  <option value="available">{t('admin.academicSetup.guided.filterAvailable')}</option>
                  <option value="enabled">{t('admin.academicSetup.guided.filterEnabled')}</option>
                  <option value="required">{t('admin.academicSetup.guided.filterRequired')}</option>
                  <option value="optional">{t('admin.academicSetup.guided.filterOptional')}</option>
                </select>
                <select
                  className="input"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as SubjectSourceFilter)}
                  aria-label={t('admin.academicSetup.guided.sourceFilter')}
                >
                  <option value="all">{t('admin.academicSetup.guided.sourceAll')}</option>
                  <option value="level">{t('admin.academicSetup.guided.sourceLevel')}</option>
                  <option value="track">{t('admin.academicSetup.guided.sourceTrack')}</option>
                </select>
              </div>

              {canEnable && (
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={selectAllAvailable}>
                    {t('admin.academicSetup.guided.selectAllAvailable')}
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={selectRequiredOnly}>
                    {t('admin.academicSetup.guided.selectRequiredOnly')}
                  </button>
                  {selectedCount > 0 && (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={clearSelection}>
                      {t('admin.academicSetup.guided.clearSelection')}
                    </button>
                  )}
                </div>
              )}

              {selectedCount > 0 && (
                <p className="tiny">
                  {t('admin.academicSetup.guided.subjectsSelectedCount', { count: selectedCount })}
                </p>
              )}

              {!filteredSubjects.length && (
                <p className="muted">{t('admin.academicSetup.guided.noSubjectsFilterMatch')}</p>
              )}

              <ul className="academic-setup-ref-levels" role="list">
                {filteredSubjects.map((subject) => {
                  const selectable = isReferenceSubjectSelectable(subject);
                  const checked = selected.has(subject.id);
                  const err = rowErrors.get(subject.id);
                  const weeklyHours = subject.defaults?.weekly_hours;
                  return (
                    <li key={subject.id}>
                      <label
                        className={`academic-setup-ref-level${!selectable ? ' academic-setup-ref-level--disabled' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!selectable || saving || !canEnable}
                          onChange={() => toggleSubject(subject)}
                          aria-label={subject.display_name}
                        />
                        <span className="academic-setup-ref-level__main">
                          <strong>{subject.display_name}</strong>
                          <span className="tiny muted block">{subject.code}</span>
                          <span className="row mt-2" style={{ gap: 6, flexWrap: 'wrap' }}>
                            {subject.required && (
                              <Badge tone="blue">{t('admin.academicSetup.guided.badgeRequired')}</Badge>
                            )}
                            {subject.optional && (
                              <Badge tone="slate">{t('admin.academicSetup.guided.badgeOptional')}</Badge>
                            )}
                            {subject.source === 'level' && (
                              <Badge tone="slate">{t('admin.academicSetup.guided.badgeLevelSubject')}</Badge>
                            )}
                            {subject.source === 'track' && (
                              <Badge tone="blue">{t('admin.academicSetup.guided.badgeTrackSubject')}</Badge>
                            )}
                            {subject.enabled && (
                              <Badge tone="green">{t('admin.academicSetup.guided.alreadyEnabled')}</Badge>
                            )}
                          </span>
                          {weeklyHours != null && weeklyHours > 0 && (
                            <span className="tiny muted block mt-2">
                              {t('admin.academicSetup.guided.weeklySessions', { count: weeklyHours })}
                            </span>
                          )}
                          {weeklyHours == null && subject.defaults?.session_duration == null && (
                            <span className="tiny muted block mt-2">
                              {t('admin.academicSetup.guided.sessionDurationUnavailable')}
                            </span>
                          )}
                        </span>
                      </label>
                      {err && (
                        <p className="tiny" style={{ color: '#b91c1c' }}>
                          {err}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                className="btn btn--primary"
                disabled={!selectedCount || saving || !canEnable}
                onClick={handleSave}
              >
                {saving
                  ? t('common.saving')
                  : t('admin.academicSetup.guided.enableSelectedSubjects')}
              </button>

              {assignmentMissingCount > 0 && (
                <div className="academic-setup-gap-banner" role="status">
                  <p>{t('admin.academicSetup.guided.subjectsNeedAssignments')}</p>
                  <Link href={nextStepHref} className="btn btn--ghost btn--sm mt-2">
                    {nextStepLabel}
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </SetupDrawer>
  );
}
