'use client';

/**
 * Direct-move distribution UX.
 *
 * Visible flow:
 *   desktop drag/drop -> automatic preview -> automatic apply -> authoritative refetch
 *   select student(s) -> choose destination -> automatic preview -> automatic apply
 *
 * Safety flow always keeps the backend preview gate before every apply.
 */

import Link from 'next/link';
import {
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Card, InfoBanner, PageHeader, StatCard } from '@/components/ui/primitives';
import { formatAcademicLevelLabel } from '@/features/admin/academic-setup/utils/format-academic-label';
import { normalizeCycleCode } from '@/features/admin/academic-setup/utils/group-and-sort-levels';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { classDistributionEndpoints } from '@/lib/api/class-distribution-endpoints';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { ApiErrorBody } from '@/types/api';
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
  applyRequestFromPreview,
  directMoveItems,
  directTargetSelectValue,
} from './direct-move';
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
import './class-distribution-direct.css';

const WORKSPACE_PAGE_SIZE = 100;
const CLASS_PREVIEW_SIZE = 4;
const CLASS_ROSTER_PAGE_SIZE = 100;
const LEVELS_QUERY = { page_size: 500 };

type CycleGroup = { cycle: LevelCycle; levels: Level[] };
type MoveTarget = number | null;

type PreviewIntent = {
  request: ClassDistributionMoveRequest;
  items: DistributionSelectionItem[];
  targetClassId: MoveTarget;
};

type ClassRosterState = {
  items: DistributionSelectionItem[] | null;
  loading: boolean;
  error: boolean;
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

function capacityLabel(cls: DistributionWorkspaceClass, t: ReturnType<typeof useT>): string {
  const available = classAvailableSeats(cls);
  const overCapacity =
    cls.capacity != null && cls.capacity > 0 && cls.assigned_count > cls.capacity;
  if (overCapacity) return t('admin.classDistribution.overCapacity');
  if (classIsFull(cls)) return t('admin.classDistribution.full');
  if (available === 1) return t('admin.classDistribution.seatAvailable');
  if (available != null) return t('admin.classDistribution.seatsAvailable', { count: available });
  return t('admin.classDistribution.capacityUnspecified');
}

function studentDisplayName(student: Student): string {
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
    name: studentDisplayName(student),
    code: student.code,
    gender: student.gender,
  };
}

function uniqueStudents(items: Student[]): Student[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function fetchFullClassRoster(
  academicYearId: number,
  classId: number,
): Promise<DistributionSelectionItem[] | null> {
  const first = await api.get<Student[]>(endpoints.admin.students, {
    academic_year_id: academicYearId,
    class_id: classId,
    page: 1,
    page_size: CLASS_ROSTER_PAGE_SIZE,
  });

  if (!first.success) return null;

  let students = [...first.data];
  const totalPages = first.meta.pagination?.total_pages ?? 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await api.get<Student[]>(endpoints.admin.students, {
      academic_year_id: academicYearId,
      class_id: classId,
      page,
      page_size: CLASS_ROSTER_PAGE_SIZE,
    });
    if (!next.success) return null;
    students = students.concat(next.data);
  }

  return uniqueStudents(students).map((student) => studentFromRoster(student, classId));
}

function DirectStudentRow({
  item,
  selected,
  dragging,
  onToggle,
  onDragStart,
  onDragEnd,
}: {
  item: DistributionSelectionItem;
  selected: boolean;
  dragging: boolean;
  onToggle: (item: DistributionSelectionItem) => void;
  onDragStart: (item: DistributionSelectionItem, event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}) {
  const t = useT();

  return (
    <div
      className="class-distribution-student class-distribution-student--draggable"
      data-selected={selected || undefined}
      draggable
      aria-grabbed={dragging}
      onDragStart={(event) => onDragStart(item, event)}
      onDragEnd={onDragEnd}
    >
      <input
        type="checkbox"
        checked={selected}
        draggable={false}
        onChange={() => onToggle(item)}
        aria-label={`${item.name} — ${genderLabel(item.gender, t)}`}
      />
      <span
        className="class-distribution-student__grip"
        aria-hidden="true"
        title={t('admin.classDistribution.moveTo')}
      >
        ⋮⋮
      </span>
      <span className="class-distribution-student__copy">
        <strong dir="auto">{item.name}</strong>
        <span>
          {item.code ? <bdi className="mono" dir="ltr">{item.code}</bdi> : null}
          <small>{genderLabel(item.gender, t)}</small>
        </span>
      </span>
    </div>
  );
}

function ClassLane({
  cls,
  roster,
  selected,
  draggingStudentId,
  moveReady,
  dropTarget,
  previewing,
  onToggle,
  onDragStart,
  onDragEnd,
  onTarget,
  onDragOverTarget,
  onDragLeaveTarget,
  onDropTarget,
  onRetryRoster,
}: {
  cls: DistributionWorkspaceClass;
  roster: ClassRosterState | undefined;
  selected: Map<number, DistributionSelectionItem>;
  draggingStudentId: number | null;
  moveReady: boolean;
  dropTarget: boolean;
  previewing: boolean;
  onToggle: (item: DistributionSelectionItem) => void;
  onDragStart: (item: DistributionSelectionItem, event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onTarget: (target: MoveTarget) => void;
  onDragOverTarget: (event: DragEvent<HTMLElement>, target: MoveTarget) => void;
  onDragLeaveTarget: (event: DragEvent<HTMLElement>, target: MoveTarget) => void;
  onDropTarget: (event: DragEvent<HTMLElement>, target: MoveTarget) => void;
  onRetryRoster: (classId: number) => void;
}) {
  const t = useT();
  const occupancy = classOccupancyPercent(cls);
  const rosterItems = roster?.items ?? [];

  function ignoreLaneClick(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && Boolean(
      target.closest('button,input,a,select,.class-distribution-student'),
    );
  }

  function handleLaneClick(event: MouseEvent<HTMLElement>) {
    if (!moveReady || ignoreLaneClick(event.target)) return;
    onTarget(cls.id);
  }

  function handleLaneKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!moveReady || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onTarget(cls.id);
  }

  return (
    <section
      className="class-distribution-lane class-distribution-lane--class class-distribution-lane--direct"
      data-move-ready={moveReady || undefined}
      data-drop-target={dropTarget || undefined}
      data-previewing={previewing || undefined}
      role={moveReady ? 'button' : undefined}
      tabIndex={moveReady ? 0 : -1}
      aria-label={cls.name}
      onClick={handleLaneClick}
      onKeyDown={handleLaneKeyDown}
      onDragEnter={(event) => onDragOverTarget(event, cls.id)}
      onDragOver={(event) => onDragOverTarget(event, cls.id)}
      onDragLeave={(event) => onDragLeaveTarget(event, cls.id)}
      onDrop={(event) => onDropTarget(event, cls.id)}
    >
      <header className="class-distribution-lane__head class-distribution-direct__lane-head">
        <div className="class-distribution-lane__title-row">
          <div>
            <strong dir="auto">{cls.name}</strong>
            {cls.code ? <small className="mono" dir="ltr">{cls.code}</small> : null}
          </div>
          <strong className="numeric-text class-distribution-direct__occupancy" dir="ltr">
            {cls.assigned_count}
            {cls.capacity != null && cls.capacity > 0 ? ` / ${cls.capacity}` : ''}
          </strong>
        </div>

        <div className="class-distribution-lane__capacity">
          <span>{capacityLabel(cls, t)}</span>
          <span>
            {t('admin.classDistribution.female')} <bdi dir="ltr">{cls.gender_summary.female}</bdi>
            {' · '}
            {t('admin.classDistribution.male')} <bdi dir="ltr">{cls.gender_summary.male}</bdi>
          </span>
        </div>

        {occupancy != null ? (
          <span className="class-distribution-lane__bar" aria-hidden="true">
            <span style={{ inlineSize: `${occupancy}%` }} />
          </span>
        ) : null}

        {moveReady ? (
          <small className="class-distribution-direct__hint">{t('admin.classDistribution.chooseTarget')}</small>
        ) : null}
      </header>

      <div className="class-distribution-lane__students">
        {roster?.loading ? (
          <div className="class-distribution-lane__empty"><strong>{t('common.loading')}</strong></div>
        ) : roster?.error ? (
          <div className="class-distribution-lane__empty">
            <p>{t('admin.classDistribution.rosterLoadFailed')}</p>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onRetryRoster(cls.id)}
            >
              {t('admin.classDistribution.retry')}
            </button>
          </div>
        ) : rosterItems.length ? (
          rosterItems.map((item) => (
            <DirectStudentRow
              key={item.studentId}
              item={item}
              selected={selected.has(item.studentId)}
              dragging={draggingStudentId === item.studentId}
              onToggle={onToggle}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        ) : (
          <div className="class-distribution-lane__empty">—</div>
        )}
      </div>

      <footer className="class-distribution-lane__roster-footer class-distribution-direct__roster-footer">
        <span>
          {t('admin.classDistribution.students')}: <bdi dir="ltr">{rosterItems.length || cls.assigned_count}</bdi>
        </span>
      </footer>
    </section>
  );
}

export function ClassDistributionDirectBoard() {
  const t = useT();
  const { locale } = useLocale();
  const { activeAcademicYearId, academicYears, academicYearLoading, academicYearError } = useAdminSession();
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels, LEVELS_QUERY);
  const cycleGroups = useMemo(() => groupLevels(levelsState.data ?? []), [levelsState.data]);

  const [cycleId, setCycleId] = useState<number | null>(null);
  const [levelId, setLevelId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [board, setBoard] = useState<ClassDistributionWorkspaceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const hasLoadedRef = useRef(false);
  const workspaceScrollerRef = useRef<HTMLDivElement | null>(null);

  const [classRosters, setClassRosters] = useState<Record<number, ClassRosterState>>({});
  const [selected, setSelected] = useState<Map<number, DistributionSelectionItem>>(() => new Map());
  const [draggingStudentId, setDraggingStudentId] = useState<number | null>(null);
  const dragItemsRef = useRef<DistributionSelectionItem[]>([]);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [previewingTargetKey, setPreviewingTargetKey] = useState<string | null>(null);

  const [preview, setPreview] = useState<ClassDistributionMovePreviewResponse | null>(null);
  const [previewIntent, setPreviewIntent] = useState<PreviewIntent | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
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
  const refetch = useCallback(() => setReloadVersion((value) => value + 1), []);

  const clearSelection = useCallback(() => {
    setSelected(new Map());
    setPreview(null);
    setPreviewIntent(null);
    setPreviewOpen(false);
    setOperationError(null);
  }, []);

  useEffect(() => {
    clearSelection();
    setNotice(null);
  }, [activeAcademicYearId, cycleId, levelId, debouncedSearch, clearSelection]);

  useEffect(() => {
    const node = workspaceScrollerRef.current;
    if (!node) return;

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (node.scrollWidth <= node.clientWidth + 2) return;

      const target = event.target;
      const verticalScroller = target instanceof HTMLElement
        ? target.closest<HTMLElement>('.class-distribution-lane__students')
        : null;

      if (verticalScroller) {
        const canScrollDown =
          event.deltaY > 0 &&
          verticalScroller.scrollTop + verticalScroller.clientHeight < verticalScroller.scrollHeight - 1;
        const canScrollUp = event.deltaY < 0 && verticalScroller.scrollTop > 0;
        if (canScrollDown || canScrollUp) return;
      }

      event.preventDefault();
      const rtl = getComputedStyle(node).direction === 'rtl';
      node.scrollBy({ left: (rtl ? -1 : 1) * event.deltaY, behavior: 'auto' });
    };

    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, [board]);

  useEffect(() => {
    if (levelId == null || activeAcademicYearId == null) {
      hasLoadedRef.current = false;
      setBoard(null);
      setClassRosters({});
      setReadError(null);
      setLoading(false);
      setFetching(false);
      return;
    }

    let cancelled = false;
    if (hasLoadedRef.current) setFetching(true);
    else setLoading(true);
    setReadError(null);

    const load = async () => {
      const commonParams = {
        academic_year_id: activeAcademicYearId,
        level_id: levelId,
        page_size: WORKSPACE_PAGE_SIZE,
        search: debouncedSearch || undefined,
        class_preview_size: CLASS_PREVIEW_SIZE,
      };

      const first = await api.get<ClassDistributionWorkspaceData>(classDistributionEndpoints.workspace, {
        ...commonParams,
        page: 1,
      });

      if (cancelled) return;
      if (!first.success) {
        setReadError(t('admin.classDistribution.loadFailed'));
        return;
      }

      const initial = first.data;
      const pageSize = Math.max(1, initial.unassigned_students.page_size || WORKSPACE_PAGE_SIZE);
      const totalPages = Math.max(1, Math.ceil(initial.unassigned_students.total / pageSize));
      let unassignedItems = [...initial.unassigned_students.items];

      for (let page = 2; page <= totalPages; page += 1) {
        const next = await api.get<ClassDistributionWorkspaceData>(classDistributionEndpoints.workspace, {
          ...commonParams,
          page,
        });
        if (cancelled) return;
        if (!next.success) {
          setReadError(t('admin.classDistribution.loadFailed'));
          return;
        }
        unassignedItems = unassignedItems.concat(next.data.unassigned_students.items);
      }

      const seen = new Set<number>();
      const allUnassigned = unassignedItems.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      setBoard({
        ...initial,
        unassigned_students: {
          ...initial.unassigned_students,
          page: 1,
          page_size: Math.max(allUnassigned.length, pageSize),
          items: allUnassigned,
        },
      });
      hasLoadedRef.current = true;
    };

    void load().finally(() => {
      if (cancelled) return;
      setLoading(false);
      setFetching(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeAcademicYearId, debouncedSearch, levelId, reloadVersion, t]);

  useEffect(() => {
    if (!board) {
      setClassRosters({});
      return;
    }

    let cancelled = false;
    const initial: Record<number, ClassRosterState> = {};
    for (const cls of board.classes) {
      initial[cls.id] = { items: null, loading: true, error: false };
    }
    setClassRosters(initial);

    const loadRosters = async () => {
      await Promise.all(
        board.classes.map(async (cls) => {
          const items = await fetchFullClassRoster(board.context.academic_year_id, cls.id);
          if (cancelled) return;
          setClassRosters((current) => ({
            ...current,
            [cls.id]: items == null
              ? { items: null, loading: false, error: true }
              : { items, loading: false, error: false },
          }));
        }),
      );
    };

    void loadRosters();
    return () => {
      cancelled = true;
    };
  }, [board]);

  const retryRoster = useCallback(async (classId: number) => {
    if (!board) return;
    setClassRosters((current) => ({
      ...current,
      [classId]: { items: current[classId]?.items ?? null, loading: true, error: false },
    }));
    const items = await fetchFullClassRoster(board.context.academic_year_id, classId);
    setClassRosters((current) => ({
      ...current,
      [classId]: items == null
        ? { items: null, loading: false, error: true }
        : { items, loading: false, error: false },
    }));
  }, [board]);

  const currentUnassignedItems = board?.unassigned_students.items ?? [];

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
    setPreview(null);
    setPreviewIntent(null);
    setPreviewOpen(false);
    setOperationError(null);
    setNotice(null);
  }

  function toggleAllUnassigned() {
    const visible = currentUnassignedItems.map<DistributionSelectionItem>((student) => ({
      studentId: student.id,
      enrollmentId: null,
      sourceClassId: null,
      name: student.name,
      code: student.code,
      gender: student.gender,
    }));
    const allSelected = visible.length > 0 && visible.every((item) => selected.has(item.studentId));

    if (!allSelected) {
      const missing = visible.filter((item) => !selected.has(item.studentId));
      if (selected.size + missing.length > MAX_DISTRIBUTION_MOVE_BATCH) {
        setOperationError(t('admin.classDistribution.selectionLimit'));
        return;
      }
    }

    setSelected((current) => {
      const next = new Map(current);
      if (allSelected) visible.forEach((item) => next.delete(item.studentId));
      else visible.forEach((item) => next.set(item.studentId, item));
      return next;
    });
    setOperationError(null);
    setNotice(null);
  }

  function targetKey(target: MoveTarget): string {
    return target == null ? 'unassigned' : String(target);
  }

  function sourceLabel(items: DistributionSelectionItem[]): string {
    if (!board || items.length === 0) return '';
    const sources = new Set(items.map((item) => item.sourceClassId));
    if (sources.size !== 1) return t('admin.classDistribution.multipleSources');
    const source = [...sources][0];
    if (source == null) return t('admin.classDistribution.unassigned');
    return board.classes.find((cls) => cls.id === source)?.name ?? t('admin.classDistribution.multipleSources');
  }

  function targetLabel(target: MoveTarget): string {
    if (target == null) return t('admin.classDistribution.unassigned');
    return board?.classes.find((cls) => cls.id === target)?.name ?? String(target);
  }

  function canMoveItemsTo(items: DistributionSelectionItem[], target: MoveTarget): boolean {
    if (applyLoading || !board || items.length === 0 || targetIsNoopForSelection(items, target)) return false;
    if (target == null) return true;
    const cls = board.classes.find((candidate) => candidate.id === target);
    return Boolean(cls && selectionFitsTargetCapacity(items, cls));
  }

  function handleBackendError(error: ApiErrorBody) {
    setOperationError(t(distributionErrorMessageKey(error)));
    setPreview(null);
    setPreviewIntent(null);
    setPreviewOpen(false);
    setPreviewingTargetKey(null);
    if (shouldRefetchAfterDistributionError(error)) {
      setSelected(new Map());
      refetch();
    }
  }

  async function applyValidatedRequest(request: ClassDistributionMoveRequest) {
    setApplyLoading(true);
    setOperationError(null);

    const applyRequest = applyRequestFromPreview(request);
    const result = await api.post<ClassDistributionMoveApplyResponse>(
      classDistributionEndpoints.move,
      applyRequest,
    );

    setApplyLoading(false);
    setPreviewingTargetKey(null);

    if (!result.success) {
      handleBackendError(result.error);
      return false;
    }
    if (!result.data.applied) {
      setOperationError(t('admin.classDistribution.applyFailed'));
      return false;
    }

    setPreviewOpen(false);
    setPreview(null);
    setPreviewIntent(null);
    setSelected(new Map());
    setNotice(t('admin.classDistribution.applySuccess'));
    refetch();
    return true;
  }

  async function requestMove(
    target: MoveTarget,
    itemsOverride?: DistributionSelectionItem[],
    autoApply = false,
  ) {
    if (!board || levelId == null) return;
    const items = itemsOverride ?? selectedItems;
    if (!items.length) return;
    if (items.length > MAX_DISTRIBUTION_MOVE_BATCH) {
      setOperationError(t('admin.classDistribution.selectionLimit'));
      return;
    }
    if (!canMoveItemsTo(items, target)) {
      setOperationError(t('admin.classDistribution.error.invalidMove'));
      return;
    }

    const request = buildDistributionMoveRequest(
      levelId,
      'preview',
      items,
      target,
      board.context.academic_year_id,
    );

    setPreviewingTargetKey(targetKey(target));
    setOperationError(null);
    setNotice(null);
    const result = await api.post<ClassDistributionMovePreviewResponse>(
      classDistributionEndpoints.move,
      request,
    );

    if (!result.success) {
      setPreviewingTargetKey(null);
      handleBackendError(result.error);
      return;
    }
    if (!result.data.valid) {
      setPreviewingTargetKey(null);
      setOperationError(t('admin.classDistribution.previewFailed'));
      return;
    }

    if (autoApply) {
      await applyValidatedRequest(request);
      return;
    }

    setPreviewingTargetKey(null);
    setPreview(result.data);
    setPreviewIntent({
      request,
      items: items.map((item) => ({ ...item })),
      targetClassId: target,
    });
    setPreviewOpen(true);
  }

  async function handleApply() {
    if (!previewIntent || !preview) return;
    await applyValidatedRequest(previewIntent.request);
  }

  function beginDrag(item: DistributionSelectionItem, event: DragEvent<HTMLElement>) {
    const items = directMoveItems(selectedItems, item);
    dragItemsRef.current = items;
    setOperationError(null);
    setNotice(null);

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(item.studentId));
    event.dataTransfer.setData(
      'application/x-raqeem-student-move',
      JSON.stringify(items.map((student) => student.studentId)),
    );

    requestAnimationFrame(() => setDraggingStudentId(item.studentId));
  }

  function endDrag() {
    dragItemsRef.current = [];
    setDraggingStudentId(null);
    setDropTargetKey(null);
  }

  function handleDragOverTarget(event: DragEvent<HTMLElement>, target: MoveTarget) {
    const items = dragItemsRef.current;
    if (!canMoveItemsTo(items, target)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetKey(targetKey(target));
  }

  function handleDragLeaveTarget(event: DragEvent<HTMLElement>, target: MoveTarget) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDropTargetKey((current) => (current === targetKey(target) ? null : current));
    }
  }

  function handleDropTarget(event: DragEvent<HTMLElement>, target: MoveTarget) {
    event.preventDefault();
    const items = dragItemsRef.current;
    if (!canMoveItemsTo(items, target)) {
      setDropTargetKey(null);
      return;
    }

    setDropTargetKey(null);
    setDraggingStudentId(null);
    dragItemsRef.current = [];
    void requestMove(target, items, true);
  }

  const contextBusy = academicYearLoading || levelsState.initialLoading;
  const directUnassignedReady = canMoveItemsTo(selectedItems, null);

  return (
    <div className="admin-workspace class-distribution class-distribution-direct">
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
              className={cycleId === group.cycle.id
                ? 'class-distribution__cycle-pill class-distribution__cycle-pill--active'
                : 'class-distribution__cycle-pill'}
              onClick={() => {
                setCycleId(group.cycle.id);
                setLevelId(null);
                setSearch('');
              }}
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
            onChange={(event) => {
              const next = Number(event.target.value);
              setLevelId(Number.isFinite(next) && next > 0 ? next : null);
              setSearch('');
            }}
          >
            <option value="">
              {cycleId == null ? t('admin.classDistribution.selectCycle') : t('admin.classDistribution.selectLevel')}
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
        <div className="class-distribution__prompt"><strong>{t('admin.classDistribution.selectLevelPrompt')}</strong></div>
      ) : null}
      {levelId != null && loading ? (
        <div className="class-distribution__prompt"><strong>{t('common.loading')}</strong></div>
      ) : null}
      {levelId != null && readError && !loading ? <InfoBanner title={readError} tone="amber" /> : null}

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
            <div
              ref={workspaceScrollerRef}
              className="class-distribution-workspace__scroller class-distribution-direct__scroller"
              tabIndex={0}
              aria-label={t('admin.classDistribution.title')}
            >
              <section
                className="class-distribution-lane class-distribution-lane--unassigned class-distribution-lane--direct"
                data-move-ready={directUnassignedReady || undefined}
                data-drop-target={dropTargetKey === 'unassigned' || undefined}
                data-previewing={previewingTargetKey === 'unassigned' || undefined}
                role={directUnassignedReady ? 'button' : undefined}
                tabIndex={directUnassignedReady ? 0 : -1}
                aria-label={t('admin.classDistribution.unassigned')}
                onClick={(event) => {
                  const target = event.target;
                  if (
                    directUnassignedReady &&
                    !(target instanceof HTMLElement && target.closest('button,input,a,select,.class-distribution-student'))
                  ) {
                    void requestMove(null);
                  }
                }}
                onKeyDown={(event) => {
                  if (directUnassignedReady && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    void requestMove(null);
                  }
                }}
                onDragEnter={(event) => handleDragOverTarget(event, null)}
                onDragOver={(event) => handleDragOverTarget(event, null)}
                onDragLeave={(event) => handleDragLeaveTarget(event, null)}
                onDrop={(event) => handleDropTarget(event, null)}
              >
                <header className="class-distribution-lane__head class-distribution-lane__head--unassigned">
                  <div className="class-distribution-lane__title-row">
                    <div>
                      <span className="class-distribution__eyebrow">{t('admin.classDistribution.unassigned')}</span>
                      <strong className="numeric-text" dir="ltr">{board.summary.unassigned_count}</strong>
                    </div>
                    {currentUnassignedItems.length ? (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={toggleAllUnassigned}>
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
                      onChange={(event) => setSearch(event.target.value)}
                      autoComplete="off"
                      dir="auto"
                    />
                  </label>
                  {directUnassignedReady ? (
                    <small className="class-distribution-direct__hint">{t('admin.classDistribution.chooseTarget')}</small>
                  ) : null}
                </header>

                <div className="class-distribution-lane__students class-distribution-lane__students--unassigned">
                  {board.summary.unassigned_count === 0 ? (
                    <div className="class-distribution-lane__empty class-distribution-lane__empty--success">
                      <span aria-hidden="true">✓</span>
                      <p>{t('admin.classDistribution.allAssigned')}</p>
                    </div>
                  ) : currentUnassignedItems.length === 0 ? (
                    <div className="class-distribution-lane__empty"><p>{t('admin.classDistribution.noSearchResults')}</p></div>
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
                        <DirectStudentRow
                          key={student.id}
                          item={item}
                          selected={selected.has(student.id)}
                          dragging={draggingStudentId === student.id}
                          onToggle={toggleSelection}
                          onDragStart={beginDrag}
                          onDragEnd={endDrag}
                        />
                      );
                    })
                  )}
                </div>
              </section>

              {board.classes.length ? (
                board.classes.map((cls) => (
                  <ClassLane
                    key={`${cls.id}:${cls.assigned_count}`}
                    cls={cls}
                    roster={classRosters[cls.id]}
                    selected={selected}
                    draggingStudentId={draggingStudentId}
                    moveReady={canMoveItemsTo(selectedItems, cls.id)}
                    dropTarget={dropTargetKey === String(cls.id)}
                    previewing={previewingTargetKey === String(cls.id)}
                    onToggle={toggleSelection}
                    onDragStart={beginDrag}
                    onDragEnd={endDrag}
                    onTarget={(target) => void requestMove(target)}
                    onDragOverTarget={handleDragOverTarget}
                    onDragLeaveTarget={handleDragLeaveTarget}
                    onDropTarget={handleDropTarget}
                    onRetryRoster={(classId) => void retryRoster(classId)}
                  />
                ))
              ) : (
                <div className="class-distribution-workspace__empty">{t('admin.classDistribution.noClasses')}</div>
              )}
            </div>
          </div>

          {selectedItems.length > 0 ? (
            <div className="class-distribution__action-bar class-distribution-direct__action" role="status">
              <div className="class-distribution-direct__action-copy">
                <strong>{t('admin.classDistribution.selectedCount', { count: selectedItems.length })}</strong>
                <span>{t('admin.classDistribution.chooseTarget')}</span>
              </div>

              <label className="class-distribution-direct__mobile-target">
                <span>{t('admin.classDistribution.moveTo')}</span>
                <select
                  className="input"
                  defaultValue=""
                  disabled={applyLoading || previewingTargetKey != null}
                  onChange={(event) => {
                    const target = directTargetSelectValue(event.currentTarget.value);
                    if (target !== undefined) void requestMove(target, undefined, true);
                  }}
                >
                  <option value="">{t('admin.classDistribution.chooseTarget')}</option>
                  <option value="unassigned" disabled={!directUnassignedReady}>{t('admin.classDistribution.unassigned')}</option>
                  {board.classes.map((cls) => (
                    <option key={cls.id} value={cls.id} disabled={!canMoveItemsTo(selectedItems, cls.id)}>
                      {cls.name} — {capacityLabel(cls, t)}
                    </option>
                  ))}
                </select>
              </label>

              <button type="button" className="btn btn--ghost" onClick={clearSelection}>
                {t('admin.classDistribution.cancelSelection')}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <ConfirmationDialog
        open={previewOpen && preview != null && previewIntent != null}
        title={t('admin.classDistribution.confirmAction')}
        confirmLabel={t('admin.classDistribution.confirmAction')}
        loading={applyLoading}
        onClose={() => {
          if (!applyLoading) setPreviewOpen(false);
        }}
        onConfirm={handleApply}
        body={preview && previewIntent && board ? (
          <div className="class-distribution-direct__confirm">
            <div className="class-distribution-direct__confirm-route">
              <div>
                <span>{t('admin.classDistribution.source')}</span>
                <strong dir="auto">{sourceLabel(previewIntent.items)}</strong>
              </div>
              <bdi aria-hidden="true">→</bdi>
              <div>
                <span>{t('admin.classDistribution.target')}</span>
                <strong dir="auto">{targetLabel(previewIntent.targetClassId)}</strong>
              </div>
            </div>

            {preview.classes.length ? (
              <div className="class-distribution-direct__confirm-metrics">
                {preview.classes.map((projection) => {
                  const name = board.classes.find((cls) => cls.id === projection.id)?.name ?? String(projection.id);
                  return (
                    <article key={projection.id}>
                      <strong dir="auto">{name}</strong>
                      <small>
                        {t('admin.classDistribution.before')} <bdi dir="ltr">{projection.before.assigned_count}</bdi>
                        {' → '}
                        {t('admin.classDistribution.after')} <bdi dir="ltr">{projection.after.assigned_count}</bdi>
                      </small>
                    </article>
                  );
                })}
              </div>
            ) : null}

            <ul className="class-distribution-direct__confirm-students">
              {previewIntent.items.slice(0, 8).map((student) => (
                <li key={student.studentId} dir="auto">{student.name}</li>
              ))}
              {previewIntent.items.length > 8 ? (
                <li>{t('admin.classDistribution.moreStudents', { count: previewIntent.items.length - 8 })}</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      />
    </div>
  );
}
