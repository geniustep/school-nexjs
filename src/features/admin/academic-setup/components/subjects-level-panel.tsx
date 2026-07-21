'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { IconBookOpen, IconPlus } from '@/components/icons/admin-icons';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type { AcademicTrack, SetupReadinessIssue } from '@/types/academic-setup';
import type { Level, SchoolClass, Subject } from '@/types/class';
import { AcademicSubjectCard } from './academic-subject-card';
import { formatAcademicLevelLabel } from '../utils/format-academic-label';
import { uniqueCycles } from '../utils/level-filters';
import {
  buildLevelSubjectsRows,
  summarizeLevelSubjects,
} from '../utils/level-subjects-overview';
import { buildLevelGroups } from '../utils/summary';

type LevelFilter = 'all' | 'pending' | 'ready';
/** Secondary filter — only when the active level supports tracks. */
type TrackFilter = 'all' | 'shared' | number;

function subjectHasAssignmentGap(
  subjectId: number,
  issues: SetupReadinessIssue[],
): boolean {
  return issues.some(
    (i) =>
      i.code === 'assignment_missing' &&
      (i.entity?.type === 'subject' ? Number(i.entity.id) === subjectId : false),
  );
}

function pickInitialLevelId(
  rows: ReturnType<typeof buildLevelSubjectsRows>,
  focusLevelId: number | null,
): string {
  if (focusLevelId != null && rows.some((r) => r.level.id === focusLevelId)) {
    return String(focusLevelId);
  }
  const pending = rows.find((r) => r.needsEnable);
  if (pending) return String(pending.level.id);
  return rows[0] ? String(rows[0].level.id) : '';
}

function subjectMatchesTrackFilter(
  subject: Subject,
  trackFilter: TrackFilter,
  classTrackIdsBySubject: Map<number, Set<number>>,
): boolean {
  if (trackFilter === 'all') return true;
  if (trackFilter === 'shared') {
    return subject.source !== 'track' && subject.track_id == null;
  }
  if (subject.track_id === trackFilter) return true;
  const viaClasses = classTrackIdsBySubject.get(subject.id);
  return viaClasses?.has(trackFilter) ?? false;
}

export function SubjectsLevelPanel({
  levels,
  subjects,
  classes,
  tracks = [],
  canManage,
  onEnableSubjects,
  onManageSubjects,
  onManageEnablement,
  readinessIssues = [],
  focusLevelId = null,
  continueLevelId = null,
  onDismissContinue,
  onSelectedLevelChange,
}: {
  levels: Level[];
  subjects: Subject[];
  classes: SchoolClass[];
  tracks?: AcademicTrack[];
  canManage: boolean;
  onEnableSubjects: (levelId: number, trackId?: number | null) => void;
  onManageSubjects: (levelId: number) => void;
  /** Enablement matrix drawer (Odoo subjects/enablement). */
  onManageEnablement?: (levelId: number) => void;
  readinessIssues?: SetupReadinessIssue[];
  focusLevelId?: number | null;
  continueLevelId?: number | null;
  onDismissContinue?: () => void;
  onSelectedLevelChange?: (levelId: number | null) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [trackFilter, setTrackFilter] = useState<TrackFilter>('all');
  const [levelId, setLevelId] = useState('');

  const rows = useMemo(
    () => buildLevelSubjectsRows(levels, classes, subjects),
    [levels, classes, subjects],
  );

  const cycles = useMemo(
    () => uniqueCycles(buildLevelGroups(levels, classes)),
    [levels, classes],
  );

  const cycleRows = useMemo(() => {
    if (cycleId == null) return rows;
    return rows.filter((r) => r.level.cycle?.id === cycleId);
  }, [rows, cycleId]);

  const summary = useMemo(() => summarizeLevelSubjects(cycleRows), [cycleRows]);

  const classTrackIdsBySubject = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const cls of classes) {
      const tid = cls.track_id ?? cls.track?.id ?? null;
      if (tid == null) continue;
      for (const s of cls.subjects ?? []) {
        const set = map.get(s.id) ?? new Set<number>();
        set.add(tid);
        map.set(s.id, set);
      }
    }
    return map;
  }, [classes]);

  useEffect(() => {
    setLevelId((prev) => {
      if (prev && rows.some((r) => String(r.level.id) === prev)) return prev;
      return pickInitialLevelId(rows, focusLevelId);
    });
  }, [rows, focusLevelId]);

  useEffect(() => {
    if (focusLevelId == null) return;
    if (rows.some((r) => r.level.id === focusLevelId)) {
      setLevelId(String(focusLevelId));
    }
  }, [focusLevelId, rows]);

  const activeRow = rows.find((r) => String(r.level.id) === levelId) ?? null;
  const activeLevel = activeRow?.level ?? null;
  const levelSupportsTracks = activeLevel?.supports_tracks === true;

  const tracksForActiveLevel = useMemo(() => {
    if (activeLevel == null || !levelSupportsTracks) return [];
    return [...tracks]
      .filter((tr) => tr.level.id === activeLevel.id)
      .sort(
        (a, b) =>
          (a.sequence ?? 0) - (b.sequence ?? 0) ||
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
  }, [tracks, activeLevel, levelSupportsTracks]);

  useEffect(() => {
    if (!levelSupportsTracks) setTrackFilter('all');
  }, [levelSupportsTracks, activeLevel?.id]);

  useEffect(() => {
    onSelectedLevelChange?.(activeLevel?.id ?? null);
  }, [activeLevel?.id, onSelectedLevelChange]);

  const selectedTrack =
    typeof trackFilter === 'number'
      ? tracksForActiveLevel.find((tr) => tr.id === trackFilter) ?? null
      : null;

  const filteredRows = useMemo(() => {
    if (levelFilter === 'pending') return cycleRows.filter((r) => r.needsEnable);
    if (levelFilter === 'ready') return cycleRows.filter((r) => !r.needsEnable);
    return cycleRows;
  }, [cycleRows, levelFilter]);

  // Keep the selected chip inside the active cycle + status filter.
  useEffect(() => {
    if (!filteredRows.length) return;
    if (filteredRows.some((r) => String(r.level.id) === levelId)) return;
    setLevelId(String(filteredRows[0].level.id));
    setTrackFilter('all');
  }, [filteredRows, levelId]);

  const displaySubjects = useMemo(() => {
    const list = (activeRow?.subjects ?? []).filter((s) =>
      levelSupportsTracks
        ? subjectMatchesTrackFilter(s, trackFilter, classTrackIdsBySubject)
        : true,
    );
    return list.sort(
      (a, b) =>
        (a.sequence ?? 0) - (b.sequence ?? 0) || a.name.localeCompare(b.name),
    );
  }, [
    activeRow?.subjects,
    trackFilter,
    classTrackIdsBySubject,
    levelSupportsTracks,
  ]);

  const activeLevelLabel = activeLevel
    ? formatAcademicLevelLabel(activeLevel, locale)
    : null;
  const continueRow =
    continueLevelId != null
      ? rows.find((r) => r.level.id === continueLevelId && r.needsEnable) ?? null
      : null;

  const enableTrackId =
    levelSupportsTracks && typeof trackFilter === 'number' ? trackFilter : null;

  if (!levels.length) {
    return (
      <div className="academic-setup-gap-banner" role="status">
        <p>{t('admin.academicSetup.guided.lockNoLevels')}</p>
        <Link
          href="/admin/settings/academic-setup/classes"
          className="btn btn--primary btn--sm mt-2"
        >
          {t('admin.academicSetup.guided.actionAddLevels')}
        </Link>
      </div>
    );
  }

  function selectLevel(id: number) {
    setLevelId(String(id));
    setTrackFilter('all');
    const el = document.getElementById(`subjects-level-chip-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  function jumpToFirstPending() {
    if (summary.firstPendingId == null) return;
    setLevelFilter(summary.pendingLevels > 0 ? 'pending' : 'all');
    selectLevel(summary.firstPendingId);
  }

  return (
    <div className="academic-subjects-panel">
      {summary.pendingLevels > 0 && (
        <div className="academic-subjects-progress" role="status">
          <div className="academic-subjects-progress__copy">
            <strong className="academic-subjects-progress__title">
              {t('admin.academicSetup.subjectsPendingBanner', {
                count: summary.pendingLevels,
              })}
            </strong>
            <p className="academic-subjects-progress__desc">
              {t('admin.academicSetup.subjectsPendingBannerDesc')}
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              className="btn btn--primary btn--sm academic-subjects-progress__cta"
              onClick={() => {
                jumpToFirstPending();
                if (summary.firstPendingId != null) {
                  onEnableSubjects(summary.firstPendingId);
                }
              }}
            >
              <IconPlus size={16} aria-hidden />
              {t('admin.academicSetup.enableSubjects')}
            </button>
          )}
        </div>
      )}

      {continueRow && canManage && (
        <div className="academic-setup-next-step__card" role="status">
          <div>
            <strong>
              {t('admin.academicSetup.subjectsContinueTitle', {
                level: formatAcademicLevelLabel(continueRow.level, locale).primary,
              })}
            </strong>
            <p className="tiny muted mt-2">
              {t('admin.academicSetup.subjectsContinueDesc')}
            </p>
          </div>
          <div className="academic-subjects-continue-actions">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => {
                selectLevel(continueRow.level.id);
                onEnableSubjects(continueRow.level.id);
                onDismissContinue?.();
              }}
            >
              {t('admin.academicSetup.subjectsContinueCta')}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onDismissContinue?.()}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      <div className="academic-subjects-rail">
        {cycles.length > 1 && (
          <div
            className="academic-subjects-rail__filters"
            role="group"
            aria-label={t('admin.academicSetup.guided.cycleFilter')}
          >
            <button
              type="button"
              className={`academic-subjects-rail__filter${cycleId == null ? ' is-active' : ''}`}
              aria-pressed={cycleId == null}
              onClick={() => setCycleId(null)}
            >
              {t('admin.academicSetup.guided.allCycles')}
            </button>
            {cycles.map((cycle) => {
              const count = rows.filter((r) => r.level.cycle?.id === cycle.id).length;
              return (
                <button
                  key={cycle.id}
                  type="button"
                  className={`academic-subjects-rail__filter${
                    cycleId === cycle.id ? ' is-active' : ''
                  }`}
                  aria-pressed={cycleId === cycle.id}
                  onClick={() => setCycleId(cycle.id)}
                >
                  {cycle.name}
                  {count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>
        )}

        <div
          className="academic-subjects-rail__filters"
          role="group"
          aria-label={t('admin.academicSetup.subjectsLevelFilterLabel')}
        >
          {(
            [
              [
                'all',
                t('admin.academicSetup.subjectsFilterAll', { count: cycleRows.length }),
              ],
              [
                'pending',
                t('admin.academicSetup.subjectsFilterPending', {
                  count: summary.pendingLevels,
                }),
              ],
              [
                'ready',
                t('admin.academicSetup.subjectsFilterReady', {
                  count: summary.readyLevels,
                }),
              ],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`academic-subjects-rail__filter${levelFilter === value ? ' is-active' : ''}`}
              aria-pressed={levelFilter === value}
              onClick={() => setLevelFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className="academic-subjects-rail__chips"
          role="listbox"
          aria-label={t('admin.selectLevel')}
        >
          {filteredRows.length === 0 ? (
            <p className="academic-subjects-rail__empty muted tiny">
              {t('admin.academicSetup.subjectsFilterEmpty')}
            </p>
          ) : (
            filteredRows.map((row) => {
              const label = formatAcademicLevelLabel(row.level, locale);
              const selected = String(row.level.id) === levelId;
              return (
                <button
                  key={row.level.id}
                  id={`subjects-level-chip-${row.level.id}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={[
                    'academic-subjects-level-chip',
                    selected ? 'is-selected' : '',
                    row.needsEnable ? 'is-pending' : 'is-ready',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => selectLevel(row.level.id)}
                >
                  <span className="academic-subjects-level-chip__name">
                    {label.primary}
                  </span>
                  {label.secondary && (
                    <span className="academic-subjects-level-chip__code" dir="ltr">
                      {label.secondary}
                    </span>
                  )}
                  <span className="academic-subjects-level-chip__badge">
                    {row.needsEnable
                      ? t('admin.academicSetup.subjectsChipNeedsEnable')
                      : t('admin.academicSetup.subjectsChipCount', {
                          count: row.subjects.length,
                        })}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {levelSupportsTracks && tracksForActiveLevel.length > 0 && (
          <div
            className="academic-subjects-rail__filters academic-subjects-rail__filters--tracks"
            role="group"
            aria-label={t('admin.academicSetup.subjectsTrackFilterLabel')}
          >
            <button
              type="button"
              className={`academic-subjects-rail__filter academic-subjects-rail__filter--track${
                trackFilter === 'all' ? ' is-active' : ''
              }`}
              aria-pressed={trackFilter === 'all'}
              onClick={() => setTrackFilter('all')}
            >
              {t('admin.academicSetup.subjectsTrackFilterAll')}
            </button>
            <button
              type="button"
              className={`academic-subjects-rail__filter academic-subjects-rail__filter--track${
                trackFilter === 'shared' ? ' is-active' : ''
              }`}
              aria-pressed={trackFilter === 'shared'}
              onClick={() => setTrackFilter('shared')}
            >
              {t('admin.academicSetup.subjectsTrackFilterShared')}
            </button>
            {tracksForActiveLevel.map((tr) => (
              <button
                key={tr.id}
                type="button"
                className={`academic-subjects-rail__filter academic-subjects-rail__filter--track${
                  trackFilter === tr.id ? ' is-active' : ''
                }`}
                aria-pressed={trackFilter === tr.id}
                onClick={() => setTrackFilter(tr.id)}
              >
                <span className="academic-subjects-rail__filter-name">{tr.name}</span>
                {tr.code && (
                  <span className="academic-subjects-rail__filter-code" dir="ltr">
                    {tr.code}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeLevel && activeRow && (
        <section
          className={[
            'academic-subjects-workspace',
            activeRow.needsEnable ? 'academic-subjects-workspace--pending' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-labelledby="subjects-workspace-title"
        >
          <header className="academic-subjects-workspace__header">
            <div className="academic-subjects-workspace__identity">
              <span className="academic-subjects-workspace__icon" aria-hidden>
                <IconBookOpen size={20} />
              </span>
              <div className="academic-subjects-workspace__copy">
                <h2
                  id="subjects-workspace-title"
                  className="academic-subjects-workspace__title"
                >
                  {activeLevelLabel?.primary ?? activeLevel.name}
                  {selectedTrack && (
                    <span className="academic-subjects-workspace__track-tag">
                      {selectedTrack.name}
                    </span>
                  )}
                </h2>
                <p className="academic-subjects-workspace__meta">
                  {activeLevelLabel?.secondary && (
                    <span dir="ltr">{activeLevelLabel.secondary}</span>
                  )}
                  {activeLevel.cycle?.name && (
                    <span>
                      {activeLevelLabel?.secondary ? ' · ' : ''}
                      {activeLevel.cycle.name}
                    </span>
                  )}
                  <span>
                    {(activeLevelLabel?.secondary || activeLevel.cycle?.name)
                      ? ' · '
                      : ''}
                    {t('admin.academicSetup.guided.levelClassCount', {
                      count: activeRow.classCount,
                    })}
                  </span>
                </p>
              </div>
            </div>

            {canManage && (
              <div className="academic-subjects-workspace__actions">
                {onManageEnablement ? (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => onManageEnablement(activeLevel.id)}
                  >
                    {t('admin.subjectEnablement.manageSubjectsAction')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => onManageSubjects(activeLevel.id)}
                  disabled={activeRow.subjects.length === 0}
                >
                  {t('admin.academicSetup.manageSubjects')}
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm academic-subjects-workspace__enable"
                  onClick={() => onEnableSubjects(activeLevel.id, enableTrackId)}
                >
                  <IconPlus size={16} aria-hidden />
                  {enableTrackId != null
                    ? t('admin.academicSetup.subjectsEnableForTrack')
                    : t('admin.academicSetup.enableSubjects')}
                </button>
              </div>
            )}
          </header>

          {displaySubjects.length > 0 ? (
            <>
              <p className="academic-subjects-workspace__count">
                {t('admin.academicSetup.subjectsActive', {
                  count: displaySubjects.length,
                })}
              </p>
              <ul className="academic-subjects-panel__list" role="list">
                {displaySubjects.map((subject) => (
                  <li key={subject.id}>
                    <AcademicSubjectCard
                      subject={subject}
                      missingAssignment={subjectHasAssignmentGap(
                        subject.id,
                        readinessIssues,
                      )}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="academic-subjects-empty">
              <div className="academic-subjects-empty__mark" aria-hidden>
                <IconBookOpen size={28} />
              </div>
              <p className="academic-subjects-empty__title">
                {trackFilter === 'shared'
                  ? t('admin.academicSetup.subjectsNoSharedForLevel')
                  : selectedTrack
                    ? t('admin.academicSetup.subjectsNoTrackSubjects', {
                        track: selectedTrack.name,
                      })
                    : t('admin.academicSetup.noSubjectsForLevel')}
              </p>
              <p className="academic-subjects-empty__desc">
                {selectedTrack
                  ? t('admin.academicSetup.subjectsNoTrackSubjectsDesc')
                  : t('admin.academicSetup.noSubjectsForLevelDesc')}
              </p>
              {canManage && (
                <div className="academic-subjects-empty__actions">
                  <button
                    type="button"
                    className="btn btn--primary academic-subjects-empty__cta"
                    onClick={() => onEnableSubjects(activeLevel.id, enableTrackId)}
                  >
                    <IconPlus size={16} aria-hidden />
                    {enableTrackId != null
                      ? t('admin.academicSetup.subjectsEnableForTrack')
                      : t('admin.academicSetup.enableSubjects')}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
