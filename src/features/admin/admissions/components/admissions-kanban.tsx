'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/states/states';
import { cn } from '@/lib/utils/cn';
import { useLocale, useT } from '@/features/i18n/locale-context';
import {
  ACTIVE_UI_STAGES,
  ALL_UI_STAGES,
  type AdmissionUiStage,
  type AdmissionsUiKanbanColumn,
} from '../utils/admission-ui-stage';
import {
  AdmissionCard,
} from './admission-card';
import type { AdmissionListItem } from '@/types/admission';

const SCROLL_STEP = 300;

function scrollToBoardStart(el: HTMLElement, dir: 'rtl' | 'ltr') {
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  el.scrollLeft = dir === 'rtl' ? max : 0;
}

export function AdmissionsKanban({
  columns: columnGroups,
  displayStages,
  showClosed,
  onLoadMore,
}: {
  columns: AdmissionsUiKanbanColumn[];
  displayStages: AdmissionUiStage[];
  showClosed: boolean;
  onUpdated?: () => void;
  onLoadMore?: (stage: AdmissionUiStage) => void;
}) {
  const t = useT();
  const { dir } = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stages = displayStages.length
    ? displayStages
    : showClosed
      ? ALL_UI_STAGES
      : ACTIVE_UI_STAGES;

  const columnByStage = useMemo(
    () => new Map(columnGroups.map((col) => [col.stage, col])),
    [columnGroups],
  );

  const allItems = useMemo(() => columnGroups.flatMap((col) => col.items), [columnGroups]);

  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const grouped = useMemo(
    () =>
      stages.map((stage) => {
        const meta = columnByStage.get(stage);
        const columnItems = meta?.items ?? [];
        return {
          stage,
          items: columnItems,
          total: meta?.total ?? columnItems.length,
          hasMore: meta?.hasMore ?? false,
          loadingMore: meta?.loadingMore ?? false,
          loading: meta?.loading ?? false,
        };
      }),
    [stages, columnByStage],
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
  }, [stages.length, showClosed, dir, resetScrollPosition]);

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

  function scrollByStep(direction: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    const step = dir === 'rtl' ? -direction * SCROLL_STEP : direction * SCROLL_STEP;
    el.scrollBy({ left: step, behavior: 'smooth' });
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

  const firstColumnLabel = t(`admin.admissions.uiStages.${stages[0]}`);

  return (
    <div className="admissions-kanban-outer">
      <div className="admissions-kanban-board">
        <div className="admissions-kanban-board__head">
          <p className="admissions-kanban-hint muted">{t('admin.admissions.kanban.uiStageHint')}</p>
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
              {grouped.map(({ stage, items: columnItems, total, hasMore, loadingMore, loading }) => (
                <section
                  key={stage}
                  className={cn(
                    'admissions-kanban__column',
                    stage === stages[0] && 'admissions-kanban__column--first',
                  )}
                  aria-label={t(`admin.admissions.uiStages.${stage}`)}
                >
                  <header className="admissions-kanban__column-header">
                    <div className="admissions-kanban__column-heading">
                      <span className="admissions-kanban__column-title">
                        {t(`admin.admissions.uiStages.${stage}`)}
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
                      columnItems.map((item: AdmissionListItem) => (
                        <AdmissionCard key={item.id} item={item} showStateBadge />
                      ))
                    )}
                    {hasMore ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm admissions-kanban__load-more"
                        disabled={loadingMore}
                        onClick={() => onLoadMore?.(stage)}
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
