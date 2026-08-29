'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Badge, Card, InfoBanner, PageHeader, StatCard } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { formatAcademicLevelLabel } from '@/features/admin/academic-setup/utils/format-academic-label';
import { normalizeCycleCode } from '@/features/admin/academic-setup/utils/group-and-sort-levels';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { classDistributionEndpoints } from '@/lib/api/class-distribution-endpoints';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { ApiErrorBody } from '@/types/api';
import type { Level, LevelCycle } from '@/types/class';
import type {
  ClassDistributionApplyResponse,
  ClassDistributionData,
  ClassDistributionPreviewResponse,
  DistributionClassSummary,
  UnassignedDistributionStudent,
} from '@/types/class-distribution';
import {
  buildDistributionAssignRequest,
  classAvailableSeats,
  classIsFull,
  classOccupancyPercent,
  distributionErrorMessageKey,
  selectedStudentsFromPage,
  shouldRefetchAfterDistributionError,
} from './utils';
import './class-distribution.css';

const PAGE_SIZE = 25;
const LEVELS_QUERY = { page_size: 500 };

type CycleGroup = { cycle: LevelCycle; levels: Level[] };

type OperationError = {
  message: string;
  raw?: ApiErrorBody;
};

function cycleTitle(cycle: LevelCycle, t: ReturnType<typeof useT>): string {
  const key = normalizeCycleCode(cycle.code);
  const i18nKey = `admin.academicSetup.guided.category.${key}`;
  const translated = t(i18nKey);
  return translated === i18nKey ? cycle.name : translated;
}

function groupLevels(levels: Level[]): CycleGroup[] {
  const buckets = new Map<number, CycleGroup>();
  for (const level of levels) {
    const cycle = level.cycle ?? { id: 0, code: 'other', name: '—', sequence: 999_999 };
    const bucket = buckets.get(cycle.id) ?? { cycle, levels: [] };
    bucket.levels.push(level);
    buckets.set(cycle.id, bucket);
  }
  return [...buckets.values()]
    .map((group) => ({
      ...group,
      levels: [...group.levels].sort((a, b) => {
        const seqA = a.sequence ?? Number.MAX_SAFE_INTEGER;
        const seqB = b.sequence ?? Number.MAX_SAFE_INTEGER;
        if (seqA !== seqB) return seqA - seqB;
        return (a.code ?? a.name).localeCompare(b.code ?? b.name, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }),
    }))
    .sort((a, b) => {
      const seqA = a.cycle.sequence ?? Number.MAX_SAFE_INTEGER;
      const seqB = b.cycle.sequence ?? Number.MAX_SAFE_INTEGER;
      if (seqA !== seqB) return seqA - seqB;
      return a.cycle.name.localeCompare(b.cycle.name);
    });
}

function genderLabel(
  gender: UnassignedDistributionStudent['gender'],
  t: ReturnType<typeof useT>,
): string {
  if (gender === 'female') return t('admin.classDistribution.genderFemale');
  if (gender === 'male') return t('admin.classDistribution.genderMale');
  return t('admin.classDistribution.genderUnspecified');
}

function readinessTone(status: DistributionClassSummary['readiness']['status']) {
  if (status === 'ready') return 'green' as const;
  if (status === 'partial') return 'amber' as const;
  return 'slate' as const;
}

function ClassTargetCard({
  cls,
  selected,
  enabled,
  onSelect,
}: {
  cls: DistributionClassSummary;
  selected: boolean;
  enabled: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  const available = classAvailableSeats(cls);
  const occupancy = classOccupancyPercent(cls);
  const full = classIsFull(cls);
  const overCapacity =
    cls.capacity != null && cls.capacity > 0 && cls.assigned_count > cls.capacity;
  const missingAssignments = cls.readiness.items.teaching_assignments.missing_count ?? 0;
  const readinessLabel =
    cls.readiness.status === 'ready'
      ? t('admin.classDistribution.ready')
      : cls.readiness.status === 'not_ready'
        ? t('admin.classDistribution.notReady')
        : `${t('admin.classDistribution.readiness')} ${cls.readiness.completed}/${cls.readiness.total}`;

  let capacityLabel = t('admin.classDistribution.capacityUnspecified');
  if (overCapacity) capacityLabel = t('admin.classDistribution.overCapacity');
  else if (full) capacityLabel = t('admin.classDistribution.full');
  else if (available === 1) capacityLabel = t('admin.classDistribution.seatAvailable');
  else if (available != null) {
    capacityLabel = t('admin.classDistribution.seatsAvailable', { count: available });
  }

  return (
    <button
      type="button"
      className={`class-distribution-card${selected ? ' class-distribution-card--selected' : ''}`}
      aria-pressed={selected}
      aria-label={`${cls.name} — ${capacityLabel}`}
      disabled={!enabled || full}
      onClick={onSelect}
      data-full={full || undefined}
      data-over-capacity={overCapacity || undefined}
    >
      <span className="class-distribution-card__head">
        <span>
          <strong dir="auto">{cls.name}</strong>
          {cls.code ? <small className="mono" dir="ltr">{cls.code}</small> : null}
        </span>
        <Badge tone={readinessTone(cls.readiness.status)}>{readinessLabel}</Badge>
      </span>

      <span className="class-distribution-card__occupancy">
        <strong className="numeric-text" dir="ltr">
          {cls.assigned_count}
          {cls.capacity != null && cls.capacity > 0 ? ` / ${cls.capacity}` : ''}
        </strong>
        <span>{capacityLabel}</span>
      </span>

      {occupancy != null ? (
        <span className="class-distribution-card__bar" aria-hidden="true">
          <span style={{ inlineSize: `${occupancy}%` }} />
        </span>
      ) : null}

      <span className="class-distribution-card__gender" aria-label={t('admin.classDistribution.students')}>
        <span>{t('admin.classDistribution.female')} <bdi dir="ltr">{cls.gender_summary.female}</bdi></span>
        <span>{t('admin.classDistribution.male')} <bdi dir="ltr">{cls.gender_summary.male}</bdi></span>
        {cls.gender_summary.unspecified > 0 ? (
          <span>{t('admin.classDistribution.unspecified')} <bdi dir="ltr">{cls.gender_summary.unspecified}</bdi></span>
        ) : null}
      </span>

      <span className="class-distribution-card__readiness">
        <span className="class-distribution-card__readiness-dots" aria-hidden="true">
          {Array.from({ length: cls.readiness.total }, (_, index) => (
            <i key={index} data-ready={index < cls.readiness.completed || undefined} />
          ))}
        </span>
        {missingAssignments > 0 ? (
          <small>
            {t('admin.classDistribution.missingAssignments', { count: missingAssignments })}
          </small>
        ) : null}
      </span>
    </button>
  );
}

export function ClassDistributionBoard() {
  const t = useT();
  const { locale } = useLocale();
  const {
    activeAcademicYearId,
    academicYears,
    academicYearLoading,
    academicYearError,
  } = useAdminSession();
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels, LEVELS_QUERY);
  const cycleGroups = useMemo(() => groupLevels(levelsState.data ?? []), [levelsState.data]);

  const [cycleId, setCycleId] = useState<number | null>(null);
  const [levelId, setLevelId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [board, setBoard] = useState<ClassDistributionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const hasLoadedRef = useRef(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [targetClassId, setTargetClassId] = useState<number | null>(null);
  const [preview, setPreview] = useState<ClassDistributionPreviewResponse | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [operationError, setOperationError] = useState<OperationError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeYear = useMemo(
    () => academicYears.find((year) => year.id === activeAcademicYearId) ?? null,
    [academicYears, activeAcademicYearId],
  );

  const levelOptions = useMemo(() => {
    if (cycleId == null) return [];
    return cycleGroups.find((group) => group.cycle.id === cycleId)?.levels ?? [];
  }, [cycleGroups, cycleId]);

  const refetch = useCallback(() => setReloadVersion((version) => version + 1), []);

  useEffect(() => {
    setSelectedIds(new Set());
    setTargetClassId(null);
    setPreview(null);
    setPreviewOpen(false);
    setOperationError(null);
    setNotice(null);
  }, [levelId, page, debouncedSearch]);

  useEffect(() => {
    if (levelId == null || activeAcademicYearId == null) {
      hasLoadedRef.current = false;
      setBoard(null);
      setReadError(null);
      setLoading(false);
      setFetching(false);
      return;
    }

    let cancelled = false;
    const hadData = hasLoadedRef.current;
    if (hadData) setFetching(true);
    else setLoading(true);
    setReadError(null);

    void api
      .get<ClassDistributionData>(classDistributionEndpoints.read, {
        academic_year_id: activeAcademicYearId,
        level_id: levelId,
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined,
      })
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          setReadError(t('admin.classDistribution.loadFailed'));
          return;
        }
        setBoard(result.data);
        hasLoadedRef.current = true;
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeAcademicYearId, levelId, page, debouncedSearch, reloadVersion, t]);

  const currentItems = board?.unassigned_students.items ?? [];
  const selectedStudents = useMemo(
    () => selectedStudentsFromPage(currentItems, selectedIds),
    [currentItems, selectedIds],
  );
  const selectedClass = useMemo(
    () => board?.classes.find((cls) => cls.id === targetClassId) ?? null,
    [board, targetClassId],
  );

  const totalPages = board
    ? Math.max(1, Math.ceil(board.unassigned_students.total / board.unassigned_students.page_size))
    : 1;

  function selectCycle(nextCycleId: number) {
    setCycleId(nextCycleId);
    setLevelId(null);
    setSearch('');
    setPage(1);
  }

  function selectLevel(value: string) {
    const next = Number(value);
    setLevelId(Number.isFinite(next) && next > 0 ? next : null);
    setSearch('');
    setPage(1);
  }

  function toggleStudent(studentId: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
    setTargetClassId(null);
    setPreview(null);
    setOperationError(null);
  }

  function toggleCurrentPage() {
    const visibleIds = currentItems.map((student) => student.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(visibleIds));
    setTargetClassId(null);
    setPreview(null);
  }

  function translateOperationError(error: ApiErrorBody): OperationError {
    return { message: t(distributionErrorMessageKey(error)), raw: error };
  }

  async function handlePreview() {
    if (levelId == null || targetClassId == null || selectedIds.size === 0) return;
    setPreviewLoading(true);
    setOperationError(null);
    setNotice(null);
    const request = buildDistributionAssignRequest(
      levelId,
      'preview',
      [...selectedIds],
      targetClassId,
    );
    const result = await api.post<ClassDistributionPreviewResponse>(
      classDistributionEndpoints.assign,
      request,
      activeAcademicYearId ? { academic_year_id: activeAcademicYearId } : undefined,
    );
    setPreviewLoading(false);
    if (!result.success) {
      setOperationError(translateOperationError(result.error));
      if (shouldRefetchAfterDistributionError(result.error)) refetch();
      return;
    }
    if (!result.data.valid) {
      setOperationError({ message: t('admin.classDistribution.previewFailed') });
      return;
    }
    setPreview(result.data);
    setPreviewOpen(true);
  }

  async function handleApply() {
    if (levelId == null || targetClassId == null || selectedIds.size === 0) return;
    setApplyLoading(true);
    setOperationError(null);
    const request = buildDistributionAssignRequest(
      levelId,
      'apply',
      [...selectedIds],
      targetClassId,
    );
    const result = await api.post<ClassDistributionApplyResponse>(
      classDistributionEndpoints.assign,
      request,
      activeAcademicYearId ? { academic_year_id: activeAcademicYearId } : undefined,
    );
    setApplyLoading(false);
    if (!result.success) {
      setPreviewOpen(false);
      setOperationError(translateOperationError(result.error));
      if (shouldRefetchAfterDistributionError(result.error)) refetch();
      return;
    }
    setPreviewOpen(false);
    setPreview(null);
    setSelectedIds(new Set());
    setTargetClassId(null);
    setNotice(t('admin.classDistribution.applySuccess'));
    refetch();
  }

  const previewTarget = preview?.classes.find((cls) => cls.id === targetClassId) ?? null;
  const previewRemaining =
    previewTarget?.after.capacity != null && previewTarget.after.capacity > 0
      ? Math.max(previewTarget.after.capacity - previewTarget.after.assigned_count, 0)
      : null;

  const contextBusy = academicYearLoading || levelsState.initialLoading;

  return (
    <div className="admin-workspace class-distribution">
      <Link href="/admin/classes" className="back-link">‹ {t('nav.classes')}</Link>
      <PageHeader
        title={t('admin.classDistribution.title')}
        subtitle={t('admin.classDistribution.subtitle')}
      />

      <Card className="class-distribution__context">
        <div className="class-distribution__year">
          <span>{t('admin.classDistribution.activeYear')}</span>
          <strong dir="auto">
            {activeYear?.name ?? (academicYearLoading ? t('common.loading') : t('common.dash'))}
          </strong>
        </div>
        <div className="class-distribution__cycle-pills" role="tablist" aria-label={t('admin.classDistribution.cycle')}>
          {cycleGroups.map((group) => (
            <button
              key={group.cycle.id}
              type="button"
              role="tab"
              aria-selected={cycleId === group.cycle.id}
              className={cycleId === group.cycle.id ? 'class-distribution__cycle-pill class-distribution__cycle-pill--active' : 'class-distribution__cycle-pill'}
              onClick={() => selectCycle(group.cycle.id)}
            >
              {cycleTitle(group.cycle, t)}
            </button>
          ))}
        </div>
        <label className="class-distribution__level-select">
          <span>{t('admin.classDistribution.level')}</span>
          <select
            className="input"
            value={levelId ?? ''}
            disabled={cycleId == null || !levelOptions.length || contextBusy}
            onChange={(event) => selectLevel(event.target.value)}
          >
            <option value="">{cycleId == null ? t('admin.classDistribution.selectCycle') : t('admin.classDistribution.selectLevel')}</option>
            {levelOptions.map((level) => {
              const label = formatAcademicLevelLabel(level, locale);
              return <option key={level.id} value={level.id}>{label.primary}</option>;
            })}
          </select>
        </label>
      </Card>

      {academicYearError ? (
        <InfoBanner title={academicYearError.message} tone="amber" />
      ) : null}
      {levelsState.error ? (
        <InfoBanner title={levelsState.error.message} tone="amber" />
      ) : null}

      {levelId == null ? (
        <div className="class-distribution__prompt">
          <span aria-hidden="true">⇢</span>
          <strong>{t('admin.classDistribution.selectLevelPrompt')}</strong>
        </div>
      ) : null}

      {levelId != null && loading ? (
        <div className="class-distribution__prompt"><strong>{t('common.loading')}</strong></div>
      ) : null}

      {levelId != null && readError && !loading ? (
        <InfoBanner title={readError} tone="amber" />
      ) : null}

      {levelId != null && board && !loading ? (
        <>
          <div className="class-distribution__summary" aria-busy={fetching || undefined}>
            <StatCard label={t('admin.classDistribution.totalRegistered')} value={board.summary.total_registered} icon="◎" />
            <StatCard label={t('admin.classDistribution.assigned')} value={board.summary.assigned_count} icon="✓" tone="green" />
            <StatCard label={t('admin.classDistribution.unassigned')} value={board.summary.unassigned_count} icon="◌" tone={board.summary.unassigned_count > 0 ? 'amber' : 'green'} />
            <StatCard label={t('admin.classDistribution.availableSeats')} value={board.summary.available_seats} icon="▦" tone="blue" />
          </div>

          {notice ? <InfoBanner title={notice} tone="green" icon="✓" /> : null}
          {operationError ? <InfoBanner title={operationError.message} tone="amber" icon="!" /> : null}

          <div className="class-distribution__workspace" aria-busy={fetching || undefined}>
            <aside className="class-distribution__unassigned">
              <div className="class-distribution__panel-head">
                <div>
                  <span className="class-distribution__eyebrow">{t('admin.classDistribution.unassigned')}</span>
                  <strong className="numeric-text" dir="ltr">{board.summary.unassigned_count}</strong>
                </div>
                {currentItems.length ? (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={toggleCurrentPage}>
                    {currentItems.every((student) => selectedIds.has(student.id))
                      ? t('admin.classDistribution.clearSelection')
                      : t('admin.classDistribution.selectCurrentPage')}
                  </button>
                ) : null}
              </div>

              <label className="class-distribution__search">
                <span aria-hidden="true">⌕</span>
                <input
                  className="input"
                  type="search"
                  value={search}
                  placeholder={t('admin.classDistribution.searchPlaceholder')}
                  aria-label={t('common.search')}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  autoComplete="off"
                  dir="auto"
                />
              </label>

              {board.summary.unassigned_count === 0 ? (
                <div className="class-distribution__empty class-distribution__empty--success">
                  <span aria-hidden="true">✓</span>
                  <p>{t('admin.classDistribution.allAssigned')}</p>
                </div>
              ) : currentItems.length === 0 ? (
                <div className="class-distribution__empty">
                  <p>{t('admin.classDistribution.noSearchResults')}</p>
                </div>
              ) : (
                <div className="class-distribution__students">
                  {currentItems.map((student) => {
                    const checked = selectedIds.has(student.id);
                    return (
                      <label key={student.id} className="class-distribution__student" data-selected={checked || undefined}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStudent(student.id)}
                          aria-label={`${student.name} — ${genderLabel(student.gender, t)}`}
                        />
                        <span className="class-distribution__student-copy">
                          <strong dir="auto">{student.name}</strong>
                          <span>
                            {student.code ? <bdi className="mono" dir="ltr">{student.code}</bdi> : null}
                            <small>{genderLabel(student.gender, t)}</small>
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {board.unassigned_students.total > board.unassigned_students.page_size ? (
                <div className="class-distribution__pagination">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    {t('admin.classDistribution.previous')}
                  </button>
                  <span>{t('admin.classDistribution.pageStatus', { page, pages: totalPages })}</span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    {t('admin.classDistribution.next')}
                  </button>
                </div>
              ) : null}
            </aside>

            <section className="class-distribution__classes" aria-label={t('nav.classes')}>
              <div className="class-distribution__classes-head">
                <div>
                  <span className="class-distribution__eyebrow">{t('nav.classes')}</span>
                  <strong>{board.context.level.display_label ?? board.context.level.display_alias ?? board.context.level.name}</strong>
                </div>
                {selectedIds.size > 0 ? (
                  <span className="class-distribution__selection-count">
                    {t('admin.classDistribution.selectedCount', { count: selectedIds.size })}
                  </span>
                ) : null}
              </div>

              {board.classes.length === 0 ? (
                <div className="class-distribution__empty">
                  <p>{t('admin.classDistribution.noClasses')}</p>
                </div>
              ) : (
                <div className="class-distribution__class-grid">
                  {board.classes.map((cls) => (
                    <ClassTargetCard
                      key={cls.id}
                      cls={cls}
                      selected={targetClassId === cls.id}
                      enabled={selectedIds.size > 0}
                      onSelect={() => {
                        setTargetClassId(cls.id);
                        setPreview(null);
                        setOperationError(null);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {selectedIds.size > 0 ? (
            <div className="class-distribution__action-bar" role="region" aria-label={t('admin.classDistribution.previewAction')}>
              <div>
                <strong>{t('admin.classDistribution.selectedCount', { count: selectedIds.size })}</strong>
                <span>{selectedClass ? selectedClass.name : t('admin.classDistribution.chooseTarget')}</span>
              </div>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!selectedClass || previewLoading}
                onClick={() => void handlePreview()}
              >
                {previewLoading ? t('common.loading') : t('admin.classDistribution.previewAction')}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <ConfirmationDialog
        open={previewOpen && preview != null}
        title={t('admin.classDistribution.previewTitle')}
        confirmLabel={t('admin.classDistribution.confirmAction')}
        loading={applyLoading}
        onClose={() => {
          if (!applyLoading) setPreviewOpen(false);
        }}
        onConfirm={handleApply}
        body={
          preview && selectedClass ? (
            <div className="class-distribution-preview">
              <p className="class-distribution-preview__lead">
                {t('admin.classDistribution.previewLead', {
                  count: preview.assignments_count,
                  className: selectedClass.name,
                })}
              </p>
              {previewTarget ? (
                <div className="class-distribution-preview__metrics">
                  <div>
                    <span>{t('admin.classDistribution.before')}</span>
                    <strong className="numeric-text" dir="ltr">{previewTarget.before.assigned_count}{previewTarget.before.capacity ? ` / ${previewTarget.before.capacity}` : ''}</strong>
                  </div>
                  <span aria-hidden="true">→</span>
                  <div>
                    <span>{t('admin.classDistribution.after')}</span>
                    <strong className="numeric-text" dir="ltr">{previewTarget.after.assigned_count}{previewTarget.after.capacity ? ` / ${previewTarget.after.capacity}` : ''}</strong>
                  </div>
                  {previewRemaining != null ? (
                    <div>
                      <span>{t('admin.classDistribution.remainingSeats')}</span>
                      <strong className="numeric-text" dir="ltr">{previewRemaining}</strong>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <ul className="class-distribution-preview__students">
                {selectedStudents.map((student) => <li key={student.id} dir="auto">{student.name}</li>)}
              </ul>
            </div>
          ) : null
        }
      />
    </div>
  );
}
