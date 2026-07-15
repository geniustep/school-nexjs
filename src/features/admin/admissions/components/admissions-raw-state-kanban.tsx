'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Presentation Kanban with change_status drag-and-drop (reason dialog required).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils/cn';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useSynchronizedHorizontalScroll } from '../hooks/use-synchronized-horizontal-scroll';
import type { AdmissionsKanbanColumn } from '../hooks/use-admissions-kanban-board';
import { isRawKanbanDropTarget, rawKanbanColumnClass } from '../utils/admission-raw-kanban';
import {
  groupKanbanColumnsForPresentation,
  isKanbanColumnDroppableForDrag,
  presentationColumnDropStage,
  resolveAdmissionProcessingStageBadgeKey,
  visibleKanbanColumnsForBoard,
  type AdmissionKanbanPresentationColumn,
  type AdmissionKanbanPresentationColumnId,
} from '../utils/admission-kanban-presentation';
import {
  resolveKanbanColumnIdAtPoint,
  shouldActivateKanbanPointerDrag,
  type KanbanPointerDragSession,
} from '../utils/admission-kanban-pointer-drag';
import { normalizeAllowedStatusTargets } from '../utils/admission-modern-actions';
import { resolveApplicationStatus } from '../utils/admission-modern-status';
import { AdmissionCard } from './admission-card';
import { AdmissionChangeStatusDialog } from './admission-change-status-dialog';
import type { AdmissionListItem } from '@/types/admission';

export { isRawKanbanDropTarget, rawKanbanColumnClass } from '../utils/admission-raw-kanban';

type PendingDrop = {
  admissionId: number;
  fromStatus: string | null;
  targetStatus: string;
  item: AdmissionListItem;
};

export function AdmissionsRawStateKanban({
  columns,
  onUpdated,
  onLoadMore,
  selectionMode = false,
  isSelected,
  onToggleSelect,
  allowDrag = true,
}: {
  columns: AdmissionsKanbanColumn[];
  onUpdated?: () => void;
  onLoadMore?: (state: string) => void;
  selectionMode?: boolean;
  isSelected?: (id: number) => boolean;
  onToggleSelect?: (id: number) => void;
  allowDrag?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const { dir } = useLocale();
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<AdmissionKanbanPresentationColumnId | null>(
    null,
  );
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  /** Initial ghost mount position; frame updates use ghostRef left/top (no setState per pixel). */
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const pointerSessionRef = useRef<KanbanPointerDragSession | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const dropTargetRef = useRef<AdmissionKanbanPresentationColumnId | null>(null);
  const dragAllowedTargetsRef = useRef<string[] | null>(null);

  const presentationColumns = useMemo(
    () => groupKanbanColumnsForPresentation(columns),
    [columns],
  );

  const allItems = useMemo(
    () => presentationColumns.flatMap((col) => col.items),
    [presentationColumns],
  );

  const findItem = useCallback(
    (id: number) => allItems.find((item) => item.id === id) ?? null,
    [allItems],
  );

  const dragAllowedTargets = useMemo(() => {
    if (draggingId == null) return null;
    const item = findItem(draggingId);
    if (!item) return null;
    const normalized = normalizeAllowedStatusTargets(item.allowed_status_targets);
    // Empty list Payload must not lock the board; drop still validates targets.
    return normalized.length > 0 ? normalized : null;
  }, [draggingId, findItem]);

  dragAllowedTargetsRef.current = dragAllowedTargets;

  const visibleColumns = useMemo(
    () =>
      visibleKanbanColumnsForBoard(presentationColumns, {
        dragging: draggingId != null,
        allowedTargetIds: dragAllowedTargets,
      }),
    [dragAllowedTargets, draggingId, presentationColumns],
  );

  const columnsKey = useMemo(
    () => presentationColumns.map((col) => col.id).join(','),
    [presentationColumns],
  );

  const {
    scrollRef,
    metrics: scrollMetrics,
    syncScrollUi,
    scrollTowardPipelineStart,
    scrollTowardPipelineEnd,
    navigateRail,
    onThumbPointerDown,
    onThumbPointerMove,
    onThumbPointerUp,
  } = useSynchronizedHorizontalScroll({ dir, resetKey: columnsKey });

  useEffect(() => {
    const id = requestAnimationFrame(() => syncScrollUi());
    return () => cancelAnimationFrame(id);
  }, [draggingId, syncScrollUi, visibleColumns.length]);

  const clearPointerDrag = useCallback(() => {
    pointerSessionRef.current = null;
    dropTargetRef.current = null;
    setDraggingId(null);
    setDropTarget(null);
    setGhostPos(null);
  }, []);

  const handleDrop = useCallback(
    (columnId: AdmissionKanbanPresentationColumnId, admissionId: number) => {
      const targetStatus = presentationColumnDropStage(columnId);
      if (!allowDrag || !targetStatus || !isRawKanbanDropTarget(targetStatus)) {
        toast.show(t('admin.admissions.kanban.dropBlockedClosed'), 'info');
        return;
      }
      const item = findItem(admissionId);
      if (!item) return;

      const current = resolveApplicationStatus(item);
      if (current === 'registered') {
        toast.error(t('admin.admissions.changeStatusDialog.registeredBlocked'));
        return;
      }
      if (current === targetStatus) return;

      const targets = normalizeAllowedStatusTargets(item.allowed_status_targets);
      if (targets.length > 0 && !targets.includes(targetStatus)) {
        toast.error(t('admin.admissions.kanban.dropTargetNotAllowed'));
        return;
      }

      setPendingId(admissionId);
      setPendingDrop({
        admissionId,
        fromStatus: current,
        targetStatus,
        // If list rows omit targets, seed with the dropped column so the dialog can open;
        // Backend still rejects disallowed transitions on submit.
        item:
          targets.length > 0
            ? item
            : { ...item, allowed_status_targets: [targetStatus] },
      });
    },
    [allowDrag, findItem, t, toast],
  );

  const beginPointerDrag = useCallback(
    (admissionId: number, event: React.PointerEvent<HTMLElement>) => {
      if (!allowDrag) return;
      pointerSessionRef.current = {
        admissionId,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        activated: false,
      };
      dropTargetRef.current = null;
      setDraggingId(admissionId);
      // Mount ghost once via React; subsequent moves update DOM left/top only.
      setGhostPos({ x: event.clientX, y: event.clientY });
    },
    [allowDrag],
  );

  /** Stable callback for all cards — preserves AdmissionCard memo during move. */
  const onCardDragPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const raw = event.currentTarget.getAttribute('data-admission-id');
      const admissionId = Number(raw);
      if (!Number.isFinite(admissionId) || admissionId <= 0) return;
      beginPointerDrag(admissionId, event);
    },
    [beginPointerDrag],
  );

  useEffect(() => {
    if (draggingId == null) return;

    const onMove = (event: PointerEvent) => {
      const session = pointerSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;

      if (
        !session.activated &&
        shouldActivateKanbanPointerDrag(
          session.startX,
          session.startY,
          event.clientX,
          event.clientY,
        )
      ) {
        session.activated = true;
      }

      if (ghostRef.current) {
        ghostRef.current.style.left = `${event.clientX + 12}px`;
        ghostRef.current.style.top = `${event.clientY + 12}px`;
      }

      const stage = resolveKanbanColumnIdAtPoint(event.clientX, event.clientY);
      let nextTarget: AdmissionKanbanPresentationColumnId | null = null;
      if (stage) {
        const dropStage = presentationColumnDropStage(stage);
        const droppable = isKanbanColumnDroppableForDrag({
          columnId: stage,
          allowDrag,
          dragging: true,
          allowedTargetIds: dragAllowedTargetsRef.current,
          dropStage,
          isDropTargetState: isRawKanbanDropTarget,
        });
        nextTarget = droppable ? stage : null;
      }
      if (dropTargetRef.current !== nextTarget) {
        dropTargetRef.current = nextTarget;
        setDropTarget(nextTarget);
      }
    };

    const onUp = (event: PointerEvent) => {
      const session = pointerSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;

      const admissionId = session.admissionId;
      const activated = session.activated;
      const stage = resolveKanbanColumnIdAtPoint(event.clientX, event.clientY);
      clearPointerDrag();

      if (!activated || !stage) return;

      const dropStage = presentationColumnDropStage(stage);
      const droppable = isKanbanColumnDroppableForDrag({
        columnId: stage,
        allowDrag,
        dragging: true,
        allowedTargetIds: (() => {
          const item = findItem(admissionId);
          if (!item) return null;
          const normalized = normalizeAllowedStatusTargets(item.allowed_status_targets);
          return normalized.length > 0 ? normalized : null;
        })(),
        dropStage,
        isDropTargetState: isRawKanbanDropTarget,
      });
      if (!droppable) {
        toast.show(t('admin.admissions.kanban.dropBlockedClosed'), 'info');
        return;
      }
      handleDrop(stage, admissionId);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearPointerDrag();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [allowDrag, clearPointerDrag, draggingId, findItem, handleDrop, t, toast]);

  const firstColumnLabel =
    visibleColumns[0] != null
      ? t(visibleColumns[0].labelKey)
      : t('admin.admissions.kanban.boardLabel');

  const draggingItem = draggingId != null ? findItem(draggingId) : null;
  const thumbTravel = Math.max(0, 1 - scrollMetrics.thumbRatio);
  const thumbOffset = scrollMetrics.thumbInset * thumbTravel;

  function renderScrollRail(position: 'top' | 'bottom') {
    return (
      <div
        className={cn(
          'admissions-kanban-scroll-rail',
          position === 'top'
            ? 'admissions-kanban-scroll-rail--top'
            : 'admissions-kanban-scroll-rail--bottom',
        )}
        data-dir={dir}
        data-testid={`admissions-kanban-scroll-rail-${position}`}
      >
        <button
          type="button"
          className="admissions-kanban-scroll-rail__nav admissions-kanban-scroll-rail__nav--end"
          aria-label={
            dir === 'rtl'
              ? t('admin.admissions.kanban.scrollForward')
              : t('admin.admissions.kanban.scrollBack')
          }
          hidden={dir === 'rtl' ? !scrollMetrics.canScrollForward : !scrollMetrics.canScrollBack}
          onClick={dir === 'rtl' ? scrollTowardPipelineEnd : scrollTowardPipelineStart}
        >
          ‹
        </button>
        <div
          className="admissions-kanban-scroll-rail__track"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              navigateRail(event.clientX, event.currentTarget);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              dir === 'rtl' ? scrollTowardPipelineEnd() : scrollTowardPipelineStart();
            }
            if (event.key === 'ArrowRight') {
              dir === 'rtl' ? scrollTowardPipelineStart() : scrollTowardPipelineEnd();
            }
          }}
          role="scrollbar"
          aria-orientation="horizontal"
          aria-label={t('admin.admissions.kanban.horizontalScroll')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(scrollMetrics.ratio * 100)}
          tabIndex={0}
        >
          <div
            className="admissions-kanban-scroll-rail__thumb"
            style={{
              width: `${Math.max(scrollMetrics.thumbRatio * 100, 8)}%`,
              left: `${thumbOffset * 100}%`,
            }}
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={onThumbPointerUp}
          />
        </div>
        <button
          type="button"
          className="admissions-kanban-scroll-rail__nav admissions-kanban-scroll-rail__nav--start"
          aria-label={
            dir === 'rtl'
              ? t('admin.admissions.kanban.scrollBack')
              : t('admin.admissions.kanban.scrollForward')
          }
          hidden={dir === 'rtl' ? !scrollMetrics.canScrollBack : !scrollMetrics.canScrollForward}
          onClick={dir === 'rtl' ? scrollTowardPipelineStart : scrollTowardPipelineEnd}
        >
          ›
        </button>
      </div>
    );
  }

  function columnAccentClass(column: AdmissionKanbanPresentationColumn): string {
    return rawKanbanColumnClass(column.id);
  }

  return (
    <div
      className="admissions-kanban-outer admissions-kanban-outer--raw"
      data-testid="admissions-raw-kanban"
      data-presentation-columns={String(visibleColumns.length)}
      data-allow-drag={allowDrag ? 'true' : 'false'}
      data-dragging={draggingId != null ? 'true' : 'false'}
    >
      <div className="admissions-kanban-board">
        <div className="admissions-kanban-board__head">
          {allowDrag ? (
            <p className="admissions-kanban-hint muted" data-testid="admissions-kanban-drag-hint">
              {t('admin.admissions.kanban.dragHint')}
            </p>
          ) : null}
          {scrollMetrics.canScrollForward ? (
            <p className="admissions-kanban-scroll-hint muted">
              {t('admin.admissions.kanban.scrollHint')}
            </p>
          ) : null}
        </div>

        {scrollMetrics.overflow ? renderScrollRail('top') : null}

        <div
          className={cn(
            'admissions-kanban-viewport',
            scrollMetrics.canScrollBack && 'admissions-kanban-viewport--fade-start',
            scrollMetrics.canScrollForward && 'admissions-kanban-viewport--fade-end',
          )}
          data-dir={dir}
        >
          <button
            type="button"
            className="admissions-kanban-scroll-btn admissions-kanban-scroll-btn--back"
            aria-label={t('admin.admissions.kanban.scrollBack')}
            hidden={!scrollMetrics.canScrollBack}
            onClick={scrollTowardPipelineStart}
          >
            ‹
          </button>

          <div
            ref={scrollRef}
            className={cn(
              'admissions-kanban-scroll',
              scrollMetrics.overflow && 'admissions-kanban-scroll--railed',
            )}
            aria-label={t('admin.admissions.kanban.boardLabel')}
            data-testid="admissions-kanban-scroll-content"
          >
            <div
              className="admissions-kanban admissions-kanban--raw admissions-kanban--presentation-4"
              data-pipeline-start={firstColumnLabel}
              data-dir={dir}
            >
              {visibleColumns.map((column, index) => {
                const dropStage = presentationColumnDropStage(column.id);
                const droppable = isKanbanColumnDroppableForDrag({
                  columnId: column.id,
                  allowDrag,
                  dragging: draggingId != null,
                  allowedTargetIds: dragAllowedTargets,
                  dropStage,
                  isDropTargetState: isRawKanbanDropTarget,
                });
                const isDropTarget = dropTarget === column.id && droppable;
                const countLabel = t('admin.admissions.kanban.columnCount', {
                  count: column.total,
                });

                return (
                  <section
                    key={column.id}
                    className={cn(
                      'admissions-kanban__column',
                      columnAccentClass(column),
                      index === 0 && 'admissions-kanban__column--first',
                      isDropTarget && 'admissions-kanban__column--drop-target',
                      column.isGhost && 'admissions-kanban__column--ghost',
                      !droppable &&
                        draggingId != null &&
                        'admissions-kanban__column--drop-blocked',
                    )}
                    data-stage={column.id}
                    data-ghost={column.isGhost ? 'true' : undefined}
                    data-droppable={droppable ? 'true' : 'false'}
                    data-testid={`admissions-kanban-col-${column.id}`}
                    aria-label={`${t(column.labelKey)} — ${countLabel}`}
                  >
                    <header className="admissions-kanban__column-header">
                      <div className="admissions-kanban__column-heading">
                        <span className="admissions-kanban__column-title">
                          {t(column.labelKey)}
                        </span>
                        <span
                          className="admissions-kanban__column-count"
                          data-testid={`admissions-kanban-count-${column.id}`}
                          title={countLabel}
                        >
                          {column.loading && column.items.length === 0 ? '…' : column.total}
                        </span>
                      </div>
                    </header>
                    <div className="admissions-kanban__column-body">
                      {column.loading && column.items.length === 0 ? (
                        <p className="admissions-kanban__empty muted">{t('common.loading')}</p>
                      ) : column.items.length === 0 ? (
                        <p className="admissions-kanban__empty">
                          {t('admin.admissions.kanban.emptyColumn')}
                        </p>
                      ) : (
                        column.items.map((item: AdmissionListItem) => {
                          const status = resolveApplicationStatus(item);
                          const draggable =
                            allowDrag &&
                            status !== 'registered' &&
                            pendingId !== item.id;
                          const subStageKey =
                            column.id === 'assessment'
                              ? resolveAdmissionProcessingStageBadgeKey(item)
                              : null;
                          return (
                            <AdmissionCard
                              key={item.id}
                              item={item}
                              showStateBadge={false}
                              hideUiStagePrimary
                              processingStageHintKey={subStageKey}
                              draggable={draggable}
                              isDragging={draggingId === item.id}
                              isSaving={pendingId === item.id}
                              selectable
                              selected={isSelected?.(item.id) ?? false}
                              selectionMode={selectionMode}
                              onToggleSelect={() => onToggleSelect?.(item.id)}
                              onUpdated={onUpdated}
                              onDragPointerDown={onCardDragPointerDown}
                            />
                          );
                        })
                      )}
                      {column.hasMore ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm admissions-kanban__load-more"
                          disabled={column.loadingMore}
                          onClick={() =>
                            column.loadMoreStage && onLoadMore?.(column.loadMoreStage)
                          }
                        >
                          {column.loadingMore
                            ? t('common.loading')
                            : t('admin.admissions.kanban.loadMore')}
                        </button>
                      ) : null}
                      {column.error ? (
                        <p className="alert alert--error tiny">{column.error.message}</p>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="admissions-kanban-scroll-btn admissions-kanban-scroll-btn--forward"
            aria-label={t('admin.admissions.kanban.scrollForward')}
            hidden={!scrollMetrics.canScrollForward}
            onClick={scrollTowardPipelineEnd}
          >
            ›
          </button>
        </div>

        {scrollMetrics.overflow ? renderScrollRail('bottom') : null}
      </div>

      {draggingId != null && ghostPos ? (
        <div
          ref={ghostRef}
          className="admissions-kanban-drag-ghost"
          data-testid="admissions-kanban-drag-ghost"
          style={{ left: ghostPos.x + 12, top: ghostPos.y + 12 }}
        >
          {draggingItem?.student_name || `#${draggingId}`}
        </div>
      ) : null}

      <AdmissionChangeStatusDialog
        admissionId={pendingDrop?.admissionId}
        applicationName={pendingDrop?.item.student_name}
        currentStatus={pendingDrop?.fromStatus}
        allowedStatusTargets={
          pendingDrop
            ? normalizeAllowedStatusTargets(pendingDrop.item.allowed_status_targets)
            : []
        }
        initialTargetStatus={pendingDrop?.targetStatus}
        open={pendingDrop != null}
        onClose={() => {
          setPendingDrop(null);
          setPendingId(null);
        }}
        onSuccess={() => {
          setPendingDrop(null);
          setPendingId(null);
          onUpdated?.();
        }}
      />
    </div>
  );
}
