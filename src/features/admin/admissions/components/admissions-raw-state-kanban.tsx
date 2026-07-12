'use client';

/**
 * Kanban by raw Odoo state columns — one server query per column (no post-pagination filter).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils/cn';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useAdmissionStateChange } from '../hooks/use-admission-state-change';
import {
  evaluateManualStageChange,
  isAdmissionManualStage,
} from '../utils/admission-stage-options';
import type { AdmissionsKanbanColumn } from '../hooks/use-admissions-kanban-board';
import {
  AdmissionCard,
  admissionCardDragPayload,
  readAdmissionCardDragPayload,
} from './admission-card';
import type { AdmissionListItem } from '@/types/admission';

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
  /** When false (e.g. awaiting_decision), cards are not draggable. */
  allowDrag?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const { dir } = useLocale();
  const { changeState, isPending } = useAdmissionStateChange();
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allItems = useMemo(
    () => columns.flatMap((col) => col.items),
    [columns],
  );

  const findItem = useCallback(
    (id: number) => allItems.find((item) => item.id === id) ?? null,
    [allItems],
  );

  const handleDrop = useCallback(
    async (targetState: string, admissionId: number) => {
      if (!allowDrag || !isAdmissionManualStage(targetState)) return;
      const item = findItem(admissionId);
      if (!item) return;

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = dir === 'rtl' ? Math.max(0, el.scrollWidth - el.clientWidth) : 0;
  }, [dir, columns.length]);

  return (
    <div
      className="admissions-kanban admissions-kanban--raw"
      data-testid="admissions-raw-kanban"
      aria-label={t('admin.admissions.kanban.boardLabel')}
    >
      <div className="admissions-kanban__scroll" ref={scrollRef} data-dir={dir}>
        {columns.map((column) => (
          <section
            key={column.state}
            className={cn(
              'admissions-kanban__column',
              dropTarget === column.state && 'admissions-kanban__column--drop-target',
            )}
            data-testid={`admissions-kanban-col-${column.state}`}
            onDragOver={(e) => {
              if (!allowDrag) return;
              e.preventDefault();
              setDropTarget(column.state);
            }}
            onDragLeave={() => setDropTarget((cur) => (cur === column.state ? null : cur))}
            onDrop={(e) => {
              if (!allowDrag) return;
              e.preventDefault();
              setDropTarget(null);
              const id = readAdmissionCardDragPayload(e.dataTransfer);
              if (id != null) void handleDrop(column.state, id);
            }}
          >
            <header className="admissions-kanban__column-header">
              <h2>{t(`admin.admissions.states.${column.state}`)}</h2>
              <span className="muted tiny">{column.total}</span>
            </header>
            <div className="admissions-kanban__column-body">
              {column.items.length === 0 && !column.loading ? (
                <p className="muted tiny">{t('admin.admissions.kanban.emptyColumn')}</p>
              ) : null}
              {column.items.map((item: AdmissionListItem) => (
                <AdmissionCard
                  key={item.id}
                  item={item}
                  draggable={allowDrag && !selectionMode}
                  isDragging={draggingId === item.id}
                  isSaving={isPending(item.id)}
                  onDragStart={(event) => {
                    setDraggingId(item.id);
                    event.dataTransfer.setData(
                      'application/x-admission-id',
                      admissionCardDragPayload(item.id),
                    );
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  selectable={selectionMode}
                  selected={isSelected?.(item.id) ?? false}
                  selectionMode={selectionMode}
                  onToggleSelect={() => onToggleSelect?.(item.id)}
                  onUpdated={onUpdated}
                />
              ))}
              {column.hasMore ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={column.loadingMore}
                  onClick={() => onLoadMore?.(column.state)}
                >
                  {column.loadingMore
                    ? t('admin.admissions.kanban.loadingMore')
                    : t('admin.admissions.kanban.loadMore')}
                </button>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
