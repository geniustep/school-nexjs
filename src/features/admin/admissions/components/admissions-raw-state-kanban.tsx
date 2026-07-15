'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Four-column presentation Kanban. Backend processing_stage values are unchanged;
 * assessment_ready + assessment_in_progress share one visible column.
 */

import { useCallback, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils/cn';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useAdmissionStateChange } from '../hooks/use-admission-state-change';
import { useSynchronizedHorizontalScroll } from '../hooks/use-synchronized-horizontal-scroll';
import type { AdmissionsKanbanColumn } from '../hooks/use-admissions-kanban-board';
import {
  hasAdmissionAllowedAction,
  canChangeAdmissionProcessingStage,
} from '../utils/admission-allowed-actions';
import {
  evaluateManualStageChange,
  isAdmissionManualStage,
} from '../utils/admission-stage-options';
import { isRawKanbanDropTarget, rawKanbanColumnClass } from '../utils/admission-raw-kanban';
import {
  groupKanbanColumnsForPresentation,
  presentationColumnDropStage,
  resolveAdmissionProcessingStageBadgeKey,
  type AdmissionKanbanPresentationColumn,
  type AdmissionKanbanPresentationColumnId,
} from '../utils/admission-kanban-presentation';
import {
  AdmissionCard,
  admissionCardDragPayload,
  readAdmissionCardDragPayload,
} from './admission-card';
import type { AdmissionListItem } from '@/types/admission';

export { isRawKanbanDropTarget, rawKanbanColumnClass } from '../utils/admission-raw-kanban';

export function AdmissionsRawStateKanban({
  columns,
  onUpdated,
  onLoadMore,
  selectionMode = false,
  isSelected,
  onToggleSelect,
  allowDrag = false,
}: {
  columns: AdmissionsKanbanColumn[];
  onUpdated?: () => void;
  onLoadMore?: (state: string) => void;
  selectionMode?: boolean;
  isSelected?: (id: number) => boolean;
  onToggleSelect?: (id: number) => void;
  /** When false (e.g. awaiting_decision workspace chrome), cards are not draggable. */
  allowDrag?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const { dir } = useLocale();
  const { changeState, isPending } = useAdmissionStateChange();
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<AdmissionKanbanPresentationColumnId | null>(
    null,
  );

  const presentationColumns = useMemo(
    () => groupKanbanColumnsForPresentation(columns),
    [columns],
  );

  const columnsKey = useMemo(
    () => presentationColumns.map((col) => col.id).join(','),
    [presentationColumns],
  );

  const {
    scrollRef,
    metrics: scrollMetrics,
    scrollTowardPipelineStart,
    scrollTowardPipelineEnd,
    navigateRail,
    onThumbPointerDown,
    onThumbPointerMove,
    onThumbPointerUp,
  } = useSynchronizedHorizontalScroll({ dir, resetKey: columnsKey });

  const allItems = useMemo(
    () => presentationColumns.flatMap((col) => col.items),
    [presentationColumns],
  );

  const findItem = useCallback(
    (id: number) => allItems.find((item) => item.id === id) ?? null,
    [allItems],
  );

  const handleDrop = useCallback(
    async (columnId: AdmissionKanbanPresentationColumnId, admissionId: number) => {
      const targetState = presentationColumnDropStage(columnId);
      if (!allowDrag || !targetState || !isRawKanbanDropTarget(targetState)) {
        toast.show(t('admin.admissions.kanban.dropBlockedClosed'), 'info');
        return;
      }
      const item = findItem(admissionId);
      if (!item) return;

      const actions = (item as AdmissionListItem & {
        allowed_actions?: Parameters<typeof hasAdmissionAllowedAction>[0];
      }).allowed_actions;
      if (actions != null && !canChangeAdmissionProcessingStage(actions)) {
        toast.show(t('admin.admissions.stateChange.failed'), 'info');
        return;
      }

      const decision = evaluateManualStageChange(item, targetState);
      if (!decision.apply || !decision.targetState) {
        toast.show(t('admin.admissions.stateChange.failed'), 'info');
        return;
      }

      const ok = await changeState(admissionId, decision.targetState);
      if (ok) onUpdated?.();
    },
    [allowDrag, changeState, findItem, onUpdated, t, toast],
  );

  const firstColumnLabel =
    presentationColumns[0] != null
      ? t(presentationColumns[0].labelKey)
      : t('admin.admissions.kanban.boardLabel');

  const thumbTravel = Math.max(0, 1 - scrollMetrics.thumbRatio);
  const thumbOffset = scrollMetrics.ratio * thumbTravel;

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
          aria-label={t('admin.admissions.kanban.scrollForward')}
          hidden={!scrollMetrics.canScrollForward}
          onClick={scrollTowardPipelineEnd}
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
            if (event.key === 'ArrowLeft') scrollTowardPipelineEnd();
            if (event.key === 'ArrowRight') scrollTowardPipelineStart();
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
              width: `${scrollMetrics.thumbRatio * 100}%`,
              left: `${thumbOffset * 100}%`,
            }}
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={onThumbPointerUp}
            onPointerCancel={onThumbPointerUp}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
        <button
          type="button"
          className="admissions-kanban-scroll-rail__nav admissions-kanban-scroll-rail__nav--start"
          aria-label={t('admin.admissions.kanban.scrollBack')}
          hidden={!scrollMetrics.canScrollBack}
          onClick={scrollTowardPipelineStart}
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
      data-presentation-columns={String(presentationColumns.length)}
    >
      <div className="admissions-kanban-board">
        <div className="admissions-kanban-board__head">
          {selectionMode ? (
            <p className="admissions-kanban-hint muted">
              {t('admin.admissions.selection.modeHint')}
            </p>
          ) : allowDrag ? (
            <p className="admissions-kanban-hint muted">
              {t('admin.admissions.kanban.dragHint')}
            </p>
          ) : (
            <p className="admissions-kanban-hint muted">
              {t('admin.admissions.kanban.noDragHint')}
            </p>
          )}
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
              {presentationColumns.map((column, index) => {
                const dropStage = presentationColumnDropStage(column.id);
                const droppable =
                  allowDrag && dropStage != null && isRawKanbanDropTarget(dropStage);
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
                      !droppable &&
                        draggingId != null &&
                        'admissions-kanban__column--drop-blocked',
                    )}
                    data-stage={column.id}
                    data-testid={`admissions-kanban-col-${column.id}`}
                    aria-label={`${t(column.labelKey)} — ${countLabel}`}
                    onDragOver={(e) => {
                      if (!allowDrag || draggingId == null) return;
                      e.preventDefault();
                      if (droppable) {
                        e.dataTransfer.dropEffect = 'move';
                        setDropTarget(column.id);
                        return;
                      }
                      e.dataTransfer.dropEffect = 'none';
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                      setDropTarget((cur) => (cur === column.id ? null : cur));
                    }}
                    onDrop={(e) => {
                      if (!allowDrag) return;
                      e.preventDefault();
                      setDropTarget(null);
                      const id = readAdmissionCardDragPayload(e.dataTransfer);
                      if (id == null) return;
                      if (!droppable) {
                        toast.show(t('admin.admissions.kanban.dropBlockedClosed'), 'info');
                        return;
                      }
                      void handleDrop(column.id, id);
                    }}
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
                          const draggable =
                            allowDrag &&
                            !selectionMode &&
                            isAdmissionManualStage(String(item.state));
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
                              isSaving={isPending(item.id)}
                              selectable
                              selected={isSelected?.(item.id) ?? false}
                              selectionMode={selectionMode}
                              onToggleSelect={() => onToggleSelect?.(item.id)}
                              onUpdated={onUpdated}
                              onDragStart={(event) => {
                                setDraggingId(item.id);
                                event.dataTransfer.setData(
                                  'application/x-admission-id',
                                  admissionCardDragPayload(item.id),
                                );
                                event.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragEnd={() => {
                                setDraggingId(null);
                                setDropTarget(null);
                              }}
                            />
                          );
                        })
                      )}
                      {column.hasMore && column.loadMoreStage ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm admissions-kanban__load-more"
                          disabled={column.loadingMore}
                          onClick={() => onLoadMore?.(column.loadMoreStage!)}
                        >
                          {column.loadingMore
                            ? t('admin.admissions.kanban.loadingMore')
                            : t('admin.admissions.kanban.loadMore')}
                        </button>
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
    </div>
  );
}
