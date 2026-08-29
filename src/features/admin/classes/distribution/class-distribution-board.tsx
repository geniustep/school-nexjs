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
import type { ApiErrorBody, Pagination } from '@/types/api';
import type { Level, LevelCycle } from '@/types/class';
import type {
  ClassDistributionMoveApplyResponse,
  ClassDistributionMovePreviewResponse,
  ClassDistributionMoveRequest,
  ClassDistributionWorkspaceData,
  DistributionSelectionItem,
  DistributionStudentGender,
  DistributionWorkspaceClass,
} from '@/types/class-distribution';
import type { Student } from '@/types/student';
import {
  MAX_DISTRIBUTION_MOVE_BATCH,
  buildDistributionMoveRequest,
  classAvailableSeats,
  classIsFull,
  classOccupancyPercent,
  distributionErrorMessageKey,
  selectionFitsTargetCapacity,
  shouldRefetchAfterDistributionError,
  targetIsNoopForSelection,
} from './utils';
import './class-distribution.css';

const PAGE_SIZE = 25;
const CLASS_PREVIEW_SIZE = 4;
const CLASS_ROSTER_PAGE_SIZE = 25;
const LEVELS_QUERY = { page_size: 500 };

type CycleGroup = { cycle: LevelCycle; levels: Level[] };
type TargetChoice = number | 'unassigned' | null;

type PreviewIntent = {
  request: ClassDistributionMoveRequest;
  items: DistributionSelectionItem[];
  targetClassId: number | null;
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

function genderLabel(gender: DistributionStudentGender, t: ReturnType<typeof useT>): string {
  if (gender === 'female') return t('admin.classDistribution.genderFemale');
  if (gender === 'male') return t('admin.classDistribution.genderMale');
  return t('admin.classDistribution.genderUnspecified');
}

function readinessTone(status: DistributionWorkspaceClass['readiness']['status']) {
  if (status === 'ready') return 'green' as const;
  if (status === 'partial') return 'amber' as const;
  return 'slate' as const;
}

function capacityLabel(cls: DistributionWorkspaceClass, t: ReturnType<typeof useT>): string {
  const available = classAvailableSeats(cls);
  const full = classIsFull(cls);
  const overCapacity =
    cls.capacity != null && cls.capacity > 0 && cls.assigned_count > cls.capacity;
  if (overCapacity) return t('admin.classDistribution.overCapacity');
  if (full) return t('admin.classDistribution.full');
  if (available === 1) return t('admin.classDistribution.seatAvailable');
  if (available != null) return t('admin.classDistribution.seatsAvailable', { count: available });
  return t('admin.classDistribution.capacityUnspecified');
}

function studentFromClass(
  student: DistributionWorkspaceClass['students_preview']['items'][number],
): DistributionSelectionItem {
  return {
    studentId: student.id,
    enrollmentId: student.enrollment_id,
    sourceClassId: student.class_id,
    name: student.name,
    code: student.code,
    gender: student.gender,
  };
}

function adminStudentDisplayName(student: Student): string {
  const fullName = student.full_name?.trim() || student.name?.trim();
  if (fullName) return fullName;
  const structured = [student.first_name?.trim(), student.last_name?.trim()]
    .filter(Boolean)
    .join(' ')
    .trim();
  return structured || student.code || `#${student.id}`;
}

function studentFromRoster(student: Student, classId: number): DistributionSelectionItem {
  return {
    studentId: student.id,
    enrollmentId: null,
    sourceClassId: classId,
    name: adminStudentDisplayName(student),
    code: student.code,
    gender: student.gender,
  };
}

function StudentRow({
  item,
  selected,
  onToggle,
}: {
  item: DistributionSelectionItem;
  selected: boolean;
  onToggle: (item: DistributionSelectionItem) => void;
}) {
  const t = useT();
  return (
    <label className="class-distribution-student" data-selected={selected || undefined}>
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(item)}
        aria-label={`${item.name} — ${genderLabel(item.gender, t)}`}
      />
      <span className="class-distribution-student__grip" aria-hidden="true">⋮⋮</span>
      <span className="class-distribution-student__copy">
        <strong dir="auto">{item.name}</strong>
        <span>
          {item.code ? <bdi className="mono" dir="ltr">{item.code}</bdi> : null}
          <small>{genderLabel(item.gender, t)}</small>
        </span>
      </span>
    </label>
  );
}

function ClassLane({
  cls,
  academicYearId,
  selected,
  selectedItems,
  target,
  onToggle,
  onTarget,
}: {
  cls: DistributionWorkspaceClass;
  academicYearId: number;
  selected: Map<number, DistributionSelectionItem>;
  selectedItems: DistributionSelectionItem[];
  target: boolean;
  onToggle: (item: DistributionSelectionItem) => void;
  onTarget: () => void;
}) {
  const t = useT();
  const occupancy = classOccupancyPercent(cls);
  const full = classIsFull(cls);
  const overCapacity =
    cls.capacity != null && cls.capacity > 0 && cls.assigned_count > cls.capacity;
  const missingAssignments = cls.readiness.items.teaching_assignments.missing_count ?? 0;
  const canTarget = selectedItems.length > 0 && selectionFitsTargetCapacity(selectedItems, cls);
  const remainder = Math.max(cls.students_preview.total - cls.students_preview.items.length, 0);

  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterItems, setRosterItems] = useState<Student[] | null>(null);
  const [rosterPagination, setRosterPagination] = useState<Pagination | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState(false);

  const loadRoster = useCallback(
    async (nextPage: number) => {
      setRosterLoading(true);
      setRosterError(false);
      const result = await api.get<Student[]>(endpoints.admin.students, {
        academic_year_id: academicYearId,
        class_id: cls.id,
        page: nextPage,
        page_size: CLASS_ROSTER_PAGE_SIZE,
      });
      setRosterLoading(false);
      if (!result.success) {
        setRosterError(true);
        return;
      }
      setRosterItems(result.data);
      setRosterPagination(result.meta.pagination ?? null);
      setRosterPage(nextPage);
    },
    [academicYearId, cls.id],
  );

  async function openRoster() {
    setRosterOpen(true);
    if (rosterItems == null) await loadRoster(1);
  }

  function closeRoster() {
    setRosterOpen(false);
    setRosterError(false);
  }

  const visibleItems = rosterOpen && rosterItems != null
    ? rosterItems.map((student) => studentFromRoster(student, cls.id))
    : cls.students_preview.items.map(studentFromClass);

  return (
    <section
      className="class-distribution-lane class-distribution-lane--class"
      data-target={target || undefined}
      aria-label={cls.name}
    >
      <header className="class-distribution-lane__head">
        <div className="class-distribution-lane__title-row">
          <div>
            <strong dir="auto">{cls.name}</strong>
            {cls.code ? <small className="mono" dir="ltr">{cls.code}</small> : null}
          </div>
          <Badge tone={readinessTone(cls.readiness.status)}>
            {t('admin.classDistribution.readiness')} {cls.readiness.completed}/{cls.readiness.total}
          </Badge>
        </div>

        <div className="class-distribution-lane__capacity">
          <strong className="numeric-text" dir="ltr">
            {cls.assigned_count}
            {cls.capacity != null && cls.capacity > 0 ? ` / ${cls.capacity}` : ''}
          </strong>
          <span>{capacityLabel(cls, t)}</span>
        </div>

        {occupancy != null ? (
          <span
            className="class-distribution-lane__bar"
            aria-hidden="true"
            data-full={full || undefined}
            data-over={overCapacity || undefined}
          >
            <span style={{ inlineSize: `${occupancy}%` }} />
          </span>
        ) : null}

        <div className="class-distribution-lane__gender" aria-label={t('admin.classDistribution.students')}>
          <span>{t('admin.classDistribution.female')} <bdi dir="ltr">{cls.gender_summary.female}</bdi></span>
          <span>{t('admin.classDistribution.male')} <bdi dir="ltr">{cls.gender_summary.male}</bdi></span>
          {cls.gender_summary.unspecified > 0 ? (
            <span>{t('admin.classDistribution.unspecified')} <bdi dir="ltr">{cls.gender_summary.unspecified}</bdi></span>
          ) : null}
        </div>

        <div className="class-distribution-lane__readiness">
          <span className="class-distribution-lane__readiness-dots" aria-hidden="true">
            {Array.from({ length: cls.readiness.total }, (_, index) => (
              <i key={index} data-ready={index < cls.readiness.completed || undefined} />
            ))}
          </span>
          {missingAssignments > 0 ? (
            <small>{t('admin.classDistribution.missingAssignments', { count: missingAssignments })}</small>
          ) : null}
        </div>

        <button
          type="button"
          className="btn btn--ghost btn--sm class-distribution-lane__target-button"
          disabled={!canTarget}
          aria-pressed={target}
          onClick={onTarget}
        >
          {target ? t('admin.classDistribution.targetSelected') : t('admin.classDistribution.setAsTarget')}
        </button>
      </header>

      <div className="class-distribution-lane__students">
        {rosterLoading ? (
          <div className="class-distribution-lane__empty">
            <strong>{t('common.loading')}</strong>
          </div>
        ) : rosterError ? (
          <div className="class-distribution-lane__empty">
            <p>{t('admin.classDistribution.rosterLoadFailed')}</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void loadRoster(rosterPage)}>
              {t('common.retry')}
            </button>
          </div>
        ) : visibleItems.length ? (
          visibleItems.map((item) => (
            <StudentRow
              key={item.studentId}
              item={item}
              selected={selected.has(item.studentId)}
              onToggle={onToggle}
            />
          ))
        ) : (
          <div
            className="class-distribution-lane__empty"
            aria-label={`0 ${t('admin.classDistribution.students')}`}
          >
            —
          </div>
        )}
      </div>

      {!rosterOpen && remainder > 0 ? (
        <footer className="class-distribution-lane__more">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void openRoster()}>
            {t('admin.classDistribution.showAllStudents')} · {t('admin.classDistribution.moreStudents', { count: remainder })}
          </button>
        </footer>
      ) : null}

      {rosterOpen ? (
        <footer className="class-distribution-lane__roster-footer">
          {rosterPagination && rosterPagination.total_pages > 1 ? (
            <div className="class-distribution__pagination class-distribution__pagination--class">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={rosterPage <= 1 || rosterLoading}
                onClick={() => void loadRoster(Math.max(1, rosterPage - 1))}
              >
                {t('admin.classDistribution.previous')}
              </button>
              <span>
                {t('admin.classDistribution.pageStatus', {
                  page: rosterPage,
                  pages: rosterPagination.total_pages,
                })}
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={rosterPage >= rosterPagination.total_pages || rosterLoading}
                onClick={() => void loadRoster(Math.min(rosterPagination.total_pages, rosterPage + 1))}
              >
                {t('admin.classDistribution.next')}
              </button>
            </div>
          ) : null}
          <button type="button" className="btn btn--ghost btn--sm" onClick={closeRoster}>
            {t('admin.classDistribution.showPreview')}
          </button>
        </footer>
      ) : null}
    </section>
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
  const [board, setBoard] = useState<ClassDistributionWorkspaceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const hasLoadedRef = useRef(false);

  const [selected, setSelected] = useState<Map<number, DistributionSelectionItem>>(() => new Map());
  const [targetChoice, setTargetChoice] = useState<TargetChoice>(null);
  const [preview, setPreview] = useState<ClassDistributionMovePreviewResponse | null>(null);
  const [previewIntent, setPreviewIntent] = useState<PreviewIntent | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeYear = useMemo(
    () => academicYears.find((year) => year.id === activeAcademicYearId) ?? null,
    [academicYears, activeAcademicYearId],
  );

  const levelOptions = useMemo(() => {
    if (cycleId == null) return [];
    return cycleGroups.find((group) => group.cycle.id === cycleId)?.levels ?? [];
  }, [cycleGroups, cycleId]);

  const selectedItems = useMemo(() => [...selected.values()], [selected]);
  const refetch = useCallback(() => setReloadVersion((version) => version + 1), []);

  const clearIntent = useCallback(() => {
    setSelected(new Map());
    setTargetChoice(null);
    setPreview(null);
    setPreviewIntent(null);
    setPreviewOpen(false);
    setOperationError(null);
  }, []);

  useEffect(() => {
    clearIntent();
    setNotice(null);
  }, [activeAcademicYearId, cycleId, levelId, page, debouncedSearch, clearIntent]);

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
      .get<ClassDistributionWorkspaceData>(classDistributionEndpoints.workspace, {
        academic_year_id: activeAcademicYearId,
        level_id: levelId,
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        class_preview_size: CLASS_PREVIEW_SIZE,
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

  const currentUnassignedItems = board?.unassigned_students.items ?? [];
  const totalPages = board
    ? Math.max(1, Math.ceil(board.unassigned_students.total / board.unassigned_students.page_size))
    : 1;

  const targetClassId = targetChoice === 'unassigned' ? null : targetChoice;
  const targetClass =
    typeof targetChoice === 'number'
      ? board?.classes.find((cls) => cls.id === targetChoice) ?? null
      : null;

  const sourceLabel = useMemo(() => {
    if (!board || selectedItems.length === 0) return '';
    const sources = new Set(selectedItems.map((item) => item.sourceClassId));
    if (sources.size !== 1) return t('admin.classDistribution.multipleSources');
    const only = [...sources][0];
    if (only == null) return t('admin.classDistribution.unassigned');
    return board.classes.find((cls) => cls.id === only)?.name ?? t('admin.classDistribution.multipleSources');
  }, [board, selectedItems, t]);

  const targetLabel = useMemo(() => {
    if (targetChoice == null) return t('admin.classDistribution.chooseTarget');
    if (targetChoice === 'unassigned') return t('admin.classDistribution.unassigned');
    return board?.classes.find((cls) => cls.id === targetChoice)?.name ?? t('admin.classDistribution.chooseTarget');
  }, [board, targetChoice, t]);

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

  function resetPreviewForSelectionChange() {
    setTargetChoice(null);
    setPreview(null);
    setPreviewIntent(null);
    setPreviewOpen(false);
    setOperationError(null);
    setNotice(null);
  }

  function toggleSelection(item: DistributionSelectionItem) {
    const adding = !selected.has(item.studentId);
    if (adding && selected.size >= MAX_DISTRIBUTION_MOVE_BATCH) {
      setOperationError(t('admin.classDistribution.selectionLimit'));
      return;
    }
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(item.studentId)) next.delete(item.studentId);
      else next.set(item.studentId, item);
      return next;
    });
    resetPreviewForSelectionChange();
  }

  function toggleCurrentUnassignedPage() {
    const visible = currentUnassignedItems.map<DistributionSelectionItem>((student) => ({
      studentId: student.id,
      enrollmentId: null,
      sourceClassId: null,
      name: student.name,
      code: student.code,
      gender: student.gender,
    }));
    const allSelected = visible.length > 0 && visible.every((item) => selected.has(item.studentId));
    if (allSelected) {
      setSelected((current) => {
        const next = new Map(current);
        visible.forEach((item) => next.delete(item.studentId));
        return next;
      });
    } else {
      const missing = visible.filter((item) => !selected.has(item.studentId));
      if (selected.size + missing.length > MAX_DISTRIBUTION_MOVE_BATCH) {
        setOperationError(t('admin.classDistribution.selectionLimit'));
        return;
      }
      setSelected((current) => {
        const next = new Map(current);
        missing.forEach((item) => next.set(item.studentId, item));
        return next;
      });
    }
    resetPreviewForSelectionChange();
  }

  function chooseTarget(value: TargetChoice) {
    setTargetChoice(value);
    setPreview(null);
    setPreviewIntent(null);
    setPreviewOpen(false);
    setOperationError(null);
    setNotice(null);
  }

  function operationErrorMessage(error: ApiErrorBody): string {
    return t(distributionErrorMessageKey(error));
  }

  function handleBackendError(error: ApiErrorBody) {
    setOperationError(operationErrorMessage(error));
    setPreviewOpen(false);
    setPreview(null);
    setPreviewIntent(null);
    if (shouldRefetchAfterDistributionError(error)) {
      setSelected(new Map());
      setTargetChoice(null);
      refetch();
    }
  }

  async function handlePreview() {
    if (
      levelId == null ||
      activeAcademicYearId == null ||
      targetChoice == null ||
      selectedItems.length === 0
    ) {
      return;
    }
    if (selectedItems.length > MAX_DISTRIBUTION_MOVE_BATCH) {
      setOperationError(t('admin.classDistribution.selectionLimit'));
      return;
    }
    if (targetIsNoopForSelection(selectedItems, targetClassId)) {
      setOperationError(t('admin.classDistribution.error.invalidMove'));
      return;
    }
    if (targetClass && !selectionFitsTargetCapacity(selectedItems, targetClass)) {
      setOperationError(t('admin.classDistribution.error.capacity'));
      return;
    }

    const request = buildDistributionMoveRequest(
      levelId,
      'preview',
      selectedItems,
      targetClassId,
      activeAcademicYearId,
    );

    setPreviewLoading(true);
    setOperationError(null);
    setNotice(null);
    const result = await api.post<ClassDistributionMovePreviewResponse>(
      classDistributionEndpoints.move,
      request,
    );
    setPreviewLoading(false);

    if (!result.success) {
      handleBackendError(result.error);
      return;
    }
    if (!result.data.valid) {
      setOperationError(t('admin.classDistribution.previewFailed'));
      return;
    }

    setPreview(result.data);
    setPreviewIntent({
      request,
      items: selectedItems.map((item) => ({ ...item })),
      targetClassId,
    });
    setPreviewOpen(true);
  }

  async function handleApply() {
    if (!previewIntent || !preview) return;
    setApplyLoading(true);
    setOperationError(null);

    const request: ClassDistributionMoveRequest = {
      ...previewIntent.request,
      mode: 'apply',
      moves: previewIntent.request.moves.map((move) => ({ ...move })),
    };
    const result = await api.post<ClassDistributionMoveApplyResponse>(
      classDistributionEndpoints.move,
      request,
    );
    setApplyLoading(false);

    if (!result.success) {
      handleBackendError(result.error);
      return;
    }

    setPreviewOpen(false);
    setPreview(null);
    setPreviewIntent(null);
    setSelected(new Map());
    setTargetChoice(null);
    setNotice(t('admin.classDistribution.applySuccess'));
    refetch();
  }

  const contextBusy = academicYearLoading || levelsState.initialLoading;
  const unassignedCanBeTarget =
    selectedItems.length > 0 && !targetIsNoopForSelection(selectedItems, null);

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
        <div
          className="class-distribution__cycle-pills"
          role="tablist"
          aria-label={t('admin.classDistribution.cycle')}
        >
          {cycleGroups.map((group) => (
            <button
              key={group.cycle.id}
              type="button"
              role="tab"
              aria-selected={cycleId === group.cycle.id}
              className={
                cycleId === group.cycle.id
                  ? 'class-distribution__cycle-pill class-distribution__cycle-pill--active'
                  : 'class-distribution__cycle-pill'
              }
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
            <option value="">
              {cycleId == null
                ? t('admin.classDistribution.selectCycle')
                : t('admin.classDistribution.selectLevel')}
            </option>
            {levelOptions.map((level) => {
              const label = formatAcademicLevelLabel(level, locale);
              return <option key={level.id} value={level.id}>{label.primary}</option>;
            })}
          </select>
        </label>
      </Card>

      {academicYearError ? <InfoBanner title={academicYearError.message} tone="amber" /> : null}
      {levelsState.error ? <InfoBanner title={levelsState.error.message} tone="amber" /> : null}

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
            <StatCard
              label={t('admin.classDistribution.unassigned')}
              value={board.summary.unassigned_count}
              icon="◌"
              tone={board.summary.unassigned_count > 0 ? 'amber' : 'green'}
            />
            <StatCard label={t('admin.classDistribution.availableSeats')} value={board.summary.available_seats} icon="▦" tone="blue" />
          </div>

          {notice ? <InfoBanner title={notice} tone="green" icon="✓" /> : null}
          {operationError ? <InfoBanner title={operationError} tone="amber" icon="!" /> : null}

          <div className="class-distribution-workspace" aria-busy={fetching || undefined}>
            <div className="class-distribution-workspace__scroller">
              <section
                className="class-distribution-lane class-distribution-lane--unassigned"
                data-target={targetChoice === 'unassigned' || undefined}
                aria-label={t('admin.classDistribution.unassigned')}
              >
                <header className="class-distribution-lane__head class-distribution-lane__head--unassigned">
                  <div className="class-distribution-lane__title-row">
                    <div>
                      <span className="class-distribution__eyebrow">{t('admin.classDistribution.unassigned')}</span>
                      <strong className="numeric-text" dir="ltr">{board.summary.unassigned_count}</strong>
                    </div>
                    {currentUnassignedItems.length ? (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={toggleCurrentUnassignedPage}>
                        {currentUnassignedItems.every((student) => selected.has(student.id))
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

                  <button
                    type="button"
                    className="btn btn--ghost btn--sm class-distribution-lane__target-button"
                    disabled={!unassignedCanBeTarget}
                    aria-pressed={targetChoice === 'unassigned'}
                    onClick={() => chooseTarget('unassigned')}
                  >
                    {targetChoice === 'unassigned'
                      ? t('admin.classDistribution.targetSelected')
                      : t('admin.classDistribution.setAsTarget')}
                  </button>
                </header>

                <div className="class-distribution-lane__students class-distribution-lane__students--unassigned">
                  {board.summary.unassigned_count === 0 ? (
                    <div className="class-distribution-lane__empty class-distribution-lane__empty--success">
                      <span aria-hidden="true">✓</span>
                      <p>{t('admin.classDistribution.allAssigned')}</p>
                    </div>
                  ) : currentUnassignedItems.length === 0 ? (
                    <div className="class-distribution-lane__empty">
                      <p>{t('admin.classDistribution.noSearchResults')}</p>
                    </div>
                  ) : (
                    currentUnassignedItems.map((student) => {
                      const item: DistributionSelectionItem = {
                        studentId: student.id,
                        enrollmentId: null,
                        sourceClassId: null,
                        name: student.name,
                        code: student.code,
                        gender: student.gender,
                      };
                      return (
                        <StudentRow
                          key={student.id}
                          item={item}
                          selected={selected.has(student.id)}
                          onToggle={toggleSelection}
                        />
                      );
                    })
                  )}
                </div>

                {board.unassigned_students.total > board.unassigned_students.page_size ? (
                  <footer className="class-distribution__pagination">
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
                  </footer>
                ) : null}
              </section>

              {board.classes.length ? (
                board.classes.map((cls) => (
                  <ClassLane
                    key={`${cls.id}:${cls.assigned_count}`}
                    cls={cls}
                    academicYearId={activeAcademicYearId}
                    selected={selected}
                    selectedItems={selectedItems}
                    target={targetChoice === cls.id}
                    onToggle={toggleSelection}
                    onTarget={() => chooseTarget(cls.id)}
                  />
                ))
              ) : (
                <div className="class-distribution-workspace__empty">
                  {t('admin.classDistribution.noClasses')}
                </div>
              )}
            </div>
          </div>

          {selectedItems.length > 0 ? (
            <div
              className="class-distribution__action-bar"
              role="region"
              aria-label={t('admin.classDistribution.previewAction')}
            >
              <div className="class-distribution__action-summary">
                <strong>{t('admin.classDistribution.selectedCount', { count: selectedItems.length })}</strong>
                <span>
                  {t('admin.classDistribution.source')}: <bdi dir="auto">{sourceLabel}</bdi>
                </span>
              </div>

              <label className="class-distribution__target-select">
                <span>{t('admin.classDistribution.moveTo')}</span>
                <select
                  className="input"
                  value={
                    targetChoice == null
                      ? ''
                      : targetChoice === 'unassigned'
                        ? 'unassigned'
                        : String(targetChoice)
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!value) chooseTarget(null);
                    else if (value === 'unassigned') chooseTarget('unassigned');
                    else chooseTarget(Number(value));
                  }}
                >
                  <option value="">{t('admin.classDistribution.chooseTarget')}</option>
                  <option value="unassigned" disabled={!unassignedCanBeTarget}>
                    {t('admin.classDistribution.unassigned')}
                  </option>
                  {board.classes.map((cls) => (
                    <option
                      key={cls.id}
                      value={cls.id}
                      disabled={!selectionFitsTargetCapacity(selectedItems, cls)}
                    >
                      {cls.name} — {capacityLabel(cls, t)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="class-distribution__action-buttons">
                <button type="button" className="btn btn--ghost" onClick={clearIntent}>
                  {t('admin.classDistribution.cancelSelection')}
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={targetChoice == null || previewLoading}
                  onClick={() => void handlePreview()}
                >
                  {previewLoading ? t('common.loading') : t('admin.classDistribution.previewAction')}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <ConfirmationDialog
        open={previewOpen && preview != null && previewIntent != null}
        title={t('admin.classDistribution.previewTitle')}
        confirmLabel={t('admin.classDistribution.confirmAction')}
        loading={applyLoading}
        onClose={() => {
          if (!applyLoading) setPreviewOpen(false);
        }}
        onConfirm={handleApply}
        body={
          preview && previewIntent && board ? (
            <div className="class-distribution-preview">
              <p className="class-distribution-preview__lead">
                {t('admin.classDistribution.previewLead', { count: preview.moves_count })}
              </p>

              <div className="class-distribution-preview__route">
                <div>
                  <span>{t('admin.classDistribution.source')}</span>
                  <strong dir="auto">{sourceLabel}</strong>
                </div>
                <span aria-hidden="true">→</span>
                <div>
                  <span>{t('admin.classDistribution.target')}</span>
                  <strong dir="auto">{targetLabel}</strong>
                </div>
              </div>

              {preview.classes.length ? (
                <div className="class-distribution-preview__affected">
                  <strong>{t('admin.classDistribution.affectedClasses')}</strong>
                  <div className="class-distribution-preview__metrics">
                    {preview.classes.map((projection) => {
                      const name = board.classes.find((cls) => cls.id === projection.id)?.name ?? String(projection.id);
                      const remaining =
                        projection.after.capacity != null && projection.after.capacity > 0
                          ? Math.max(projection.after.capacity - projection.after.assigned_count, 0)
                          : null;
                      return (
                        <article key={projection.id}>
                          <strong dir="auto">{name}</strong>
                          <div>
                            <span>{t('admin.classDistribution.before')}</span>
                            <bdi className="numeric-text" dir="ltr">
                              {projection.before.assigned_count}
                              {projection.before.capacity ? ` / ${projection.before.capacity}` : ''}
                            </bdi>
                          </div>
                          <div>
                            <span>{t('admin.classDistribution.after')}</span>
                            <bdi className="numeric-text" dir="ltr">
                              {projection.after.assigned_count}
                              {projection.after.capacity ? ` / ${projection.after.capacity}` : ''}
                            </bdi>
                          </div>
                          <div>
                            <span>{t('admin.classDistribution.delta')}</span>
                            <bdi className="numeric-text" dir="ltr">
                              {projection.delta > 0 ? `+${projection.delta}` : projection.delta}
                            </bdi>
                          </div>
                          {remaining != null ? (
                            <div>
                              <span>{t('admin.classDistribution.remainingSeats')}</span>
                              <bdi className="numeric-text" dir="ltr">{remaining}</bdi>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <ul className="class-distribution-preview__students">
                {previewIntent.items.map((student) => (
                  <li key={student.studentId}>
                    <span dir="auto">{student.name}</span>
                    {student.code ? <bdi className="mono" dir="ltr">{student.code}</bdi> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        }
      />
    </div>
  );
}
