'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/states/states';
import { cn } from '@/lib/utils/cn';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { ACTIVE_KANBAN_STATES, CLOSED_KANBAN_STATES } from '../utils/admission-labels';
import { useAdmissionStateChange } from '../hooks/use-admission-state-change';
import {
  ADMISSION_CARD_DRAG_MIME,
  AdmissionCard,
  admissionCardDragPayload,
  readAdmissionCardDragPayload,
} from './admission-card';
import type { AdmissionListItem } from '@/types/admission';

const SCROLL_STEP = 300;

function scrollToBoardStart(el: HTMLElement, dir: 'rtl' | 'ltr') {
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  el.scrollLeft = dir === 'rtl' ? max : 0;
}

import type { AdmissionsKanbanColumn } from '../hooks/use-admissions-kanban-board';

export function AdmissionsKanban({
  columns: columnGroups,
  displayStates,
  showClosed,
  onUpdated,
  onLoadMore,
}: {
  columns: AdmissionsKanbanColumn[];
  displayStates: string[];
  showClosed: boolean;
  onUpdated?: () => void;
  onLoadMore?: (state: string) => void;
}) {
  const t = useT();
  const { dir } = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns = displayStates.length
    ? displayStates
    : showClosed
      ? [...ACTIVE_KANBAN_STATES, ...CLOSED_KANBAN_STATES]
      : ACTIVE_KANBAN_STATES;

  const columnByState = useMemo(
    () => new Map(columnGroups.map((col) => [col.state, col])),
    [columnGroups],
  );

  const allItems = useMemo(() => columnGroups.flatMap((col) => col.items), [columnGroups]);

  const [localItems, setLocalItems] = useState(allItems);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTargetState, setDropTargetState] = useState<string | null>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const { changeState, isPending } = useAdmissionStateChange(onUpdated);

  useEffect(() => {
    setLocalItems(allItems);
  }, [allItems]);

  const grouped = useMemo(
    () =>
      columns.map((state) => {
        const meta = columnByState.get(state);
        const columnItems = localItems.filter((item) => item.state === state);
        const visibleTotal =
          typeof meta?.visibleTotal === 'number' ? meta.visibleTotal : columnItems.length;
        return {
          state,
          items: columnItems,
          total: visibleTotal,
          hasMore: meta?.hasMore ?? false,
          loadingMore: meta?.loadingMore ?? false,
          loading: meta?.loading ?? false,
        };
      }),
    [columns, columnByState, localItems],
  );

  const updateScrollEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const pos = el.scrollLeft;
    if (dir === 'rtl') {
      setCanScrollBack(pos < max - 2);
      setCanScrollForward(pos > 2);
    } else {
      setCanScrollBack(pos > 2);
      setCanScrollForward(pos < max - 2);
    }
  }, [dir]);

  const resetScrollPosition = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    scrollToBoardStart(el, dir);
    requestAnimationFrame(updateScrollEdges);
  }, [dir, updateScrollEdges]);

  useEffect(() => {
    resetScrollPosition();
  }, [columns.length, showClosed, dir, resetScrollPosition]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => updateScrollEdges();
    const ro = new ResizeObserver(() => {
      updateScrollEdges();
    });

    el.addEventListener('scroll', onScroll, { passive: true });
    ro.observe(el);
    updateScrollEdges();

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [dir, resetScrollPosition, updateScrollEdges]);

  const moveItem = useCallback(
    async (admissionId: number, nextState: string) => {
      const current = localItems.find((item) => item.id === admissionId);
      if (!current || current.state === nextState) return;

      const snapshot = localItems;
      setLocalItems((prev) =>
        prev.map((item) => (item.id === admissionId ? { ...item, state: nextState } : item)),
      );

      const ok = await changeState(admissionId, nextState);
      if (!ok) setLocalItems(snapshot);
    },
    [changeState, localItems],
  );

  function scrollByStep(direction: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    const step = dir === 'rtl' ? -direction * SCROLL_STEP : direction * SCROLL_STEP;
    el.scrollBy({ left: step, behavior: 'smooth' });
  }

  function handleDragStart(event: React.DragEvent<HTMLDivElement>, admissionId: number) {
    event.dataTransfer.setData(ADMISSION_CARD_DRAG_MIME, admissionCardDragPayload(admissionId));
    event.dataTransfer.setData('text/plain', admissionCardDragPayload(admissionId));
    event.dataTransfer.effectAllowed = 'move';
    setDraggingId(admissionId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropTargetState(null);
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>, state: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetState(state);
  }

  function handleDrop(event: React.DragEvent<HTMLElement>, state: string) {
    event.preventDefault();
    setDropTargetState(null);
    setDraggingId(null);
    const admissionId = readAdmissionCardDragPayload(event.dataTransfer);
    if (admissionId == null) return;
    void moveItem(admissionId, state);
  }

  if (
    !columnGroups.some((col) => col.loading) &&
    allItems.length === 0 &&
    !columnGroups.some((col) => col.hasMore)
  ) {
    return (
      <EmptyState
        icon="📋"
        title={t('admin.admissions.empty.title')}
        description={t('admin.admissions.empty.description')}
      />
    );
  }

  const firstColumnLabel = t(`admin.admissions.states.${columns[0]}`);

  return (
    <div className="admissions-kanban-outer">
      <div className="admissions-kanban-board">
        <div className="admissions-kanban-board__head">
          <p className="admissions-kanban-hint muted">{t('admin.admissions.kanban.dragHint')}</p>
          {canScrollForward ? (
            <p className="admissions-kanban-scroll-hint muted">{t('admin.admissions.kanban.scrollHint')}</p>
          ) : null}
        </div>

        <div
          className={cn(
            'admissions-kanban-viewport',
            canScrollBack && 'admissions-kanban-viewport--fade-start',
            canScrollForward && 'admissions-kanban-viewport--fade-end',
          )}
          data-dir={dir}
        >
          <button
            type="button"
            className="admissions-kanban-scroll-btn admissions-kanban-scroll-btn--back"
            aria-label={t('admin.admissions.kanban.scrollBack')}
            hidden={!canScrollBack}
            onClick={() => scrollByStep(-1)}
          >
            ‹
          </button>

          <div
            ref={scrollRef}
            className="admissions-kanban-scroll"
            aria-label={t('admin.admissions.kanban.boardLabel')}
          >
            <div className="admissions-kanban" data-pipeline-start={firstColumnLabel} data-dir={dir}>
              {grouped.map(({ state, items: columnItems, total, hasMore, loadingMore, loading }) => (
                <section
                  key={state}
                  className={cn(
                    'admissions-kanban__column',
                    state === columns[0] && 'admissions-kanban__column--first',
                    dropTargetState === state && 'admissions-kanban__column--drop-target',
                  )}
                  aria-label={t(`admin.admissions.states.${state}`)}
                  onDragOver={(event) => handleDragOver(event, state)}
                  onDragLeave={() => setDropTargetState((prev) => (prev === state ? null : prev))}
                  onDrop={(event) => handleDrop(event, state)}
                >
                  <header className="admissions-kanban__column-header">
                    <div className="admissions-kanban__column-heading">
                      <span className="admissions-kanban__column-title">
                        {t(`admin.admissions.states.${state}`)}
                      </span>
                      <span className="admissions-kanban__column-count" aria-hidden="true">
                        {total}
                      </span>
                    </div>
                  </header>
                  <div className="admissions-kanban__column-body">
                    {loading ? (
                      <p className="admissions-kanban__empty muted">{t('common.loading')}</p>
                    ) : columnItems.length === 0 ? (
                      <p className="admissions-kanban__empty">{t('admin.admissions.kanban.emptyColumn')}</p>
                    ) : (
                      columnItems.map((item) => (
                        <AdmissionCard
                          key={item.id}
                          item={item}
                          draggable
                          showStateBadge={false}
                          isDragging={draggingId === item.id}
                          isSaving={isPending(item.id)}
                          onDragStart={(event) => handleDragStart(event, item.id)}
                          onDragEnd={handleDragEnd}
                        />
                      ))
                    )}
                    {hasMore ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm admissions-kanban__load-more"
                        disabled={loadingMore}
                        onClick={() => onLoadMore?.(state)}
                      >
                        {loadingMore
                          ? t('admin.admissions.kanban.loadingMore')
                          : t('admin.admissions.kanban.loadMore')}
                      </button>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="admissions-kanban-scroll-btn admissions-kanban-scroll-btn--forward"
            aria-label={t('admin.admissions.kanban.scrollForward')}
            hidden={!canScrollForward}
            onClick={() => scrollByStep(1)}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
