'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/states/states';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import { ACTIVE_KANBAN_STATES, CLOSED_KANBAN_STATES } from '../utils/admission-labels';
import { useAdmissionStateChange } from '../hooks/use-admission-state-change';
import {
  ADMISSION_CARD_DRAG_MIME,
  AdmissionCard,
  admissionCardDragPayload,
  readAdmissionCardDragPayload,
} from './admission-card';
import type { AdmissionListItem } from '@/types/admission';

export function AdmissionsKanban({
  items,
  showClosed,
  onUpdated,
}: {
  items: AdmissionListItem[];
  showClosed: boolean;
  onUpdated?: () => void;
}) {
  const t = useT();
  const columns = showClosed
    ? [...ACTIVE_KANBAN_STATES, ...CLOSED_KANBAN_STATES]
    : ACTIVE_KANBAN_STATES;

  const [localItems, setLocalItems] = useState(items);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTargetState, setDropTargetState] = useState<string | null>(null);
  const { changeState, isPending } = useAdmissionStateChange(onUpdated);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const grouped = useMemo(
    () =>
      columns.map((state) => ({
        state,
        items: localItems.filter((item) => item.state === state),
      })),
    [columns, localItems],
  );

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

  if (!items.length) {
    return (
      <EmptyState
        icon="📋"
        title={t('admin.admissions.empty.title')}
        description={t('admin.admissions.empty.description')}
      />
    );
  }

  return (
    <div className="admissions-kanban-scroll">
      <p className="admissions-kanban-hint muted">{t('admin.admissions.kanban.dragHint')}</p>
      <div className="admissions-kanban">
        {grouped.map(({ state, items: columnItems }) => (
          <section
            key={state}
            className={cn(
              'admissions-kanban__column',
              dropTargetState === state && 'admissions-kanban__column--drop-target',
            )}
            aria-label={t(`admin.admissions.states.${state}`)}
            onDragOver={(event) => handleDragOver(event, state)}
            onDragLeave={() => setDropTargetState((prev) => (prev === state ? null : prev))}
            onDrop={(event) => handleDrop(event, state)}
          >
            <header className="admissions-kanban__column-header">
              <span className="admissions-kanban__column-title">
                {t(`admin.admissions.states.${state}`)}
              </span>
              <span className="admissions-kanban__column-count">{columnItems.length}</span>
            </header>
            <div className="admissions-kanban__column-body">
              {columnItems.length === 0 ? (
                <p className="admissions-kanban__empty">{t('admin.admissions.kanban.emptyColumn')}</p>
              ) : (
                columnItems.map((item) => (
                  <AdmissionCard
                    key={item.id}
                    item={item}
                    draggable
                    isDragging={draggingId === item.id}
                    isSaving={isPending(item.id)}
                    onDragStart={(event) => handleDragStart(event, item.id)}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
