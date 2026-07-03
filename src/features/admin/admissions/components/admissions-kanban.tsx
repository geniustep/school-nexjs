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
  const thumbDragRef = useRef<{ startX: number; startScroll: number } | null>(null);
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
  const [scrollMetrics, setScrollMetrics] = useState({
    ratio: 0,
    thumbRatio: 1,
    overflow: false,
  });

  const syncScrollUi = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const pos = el.scrollLeft;
    const overflow = max > 2;
    const ratio = max > 0 ? pos / max : 0;
    const thumbRatio = overflow
      ? Math.max(0.14, Math.min(1, el.clientWidth / el.scrollWidth))
      : 1;

    setCanScrollBack(pos < max - 2);
    setCanScrollForward(pos > 2);

    setScrollMetrics({ ratio, thumbRatio, overflow });
  }, []);

  const scrollTowardPipelineStart = useCallback(() => {
    scrollRef.current?.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
  }, []);

  const scrollTowardPipelineEnd = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
  }, []);

  const setScrollRatio = useCallback((ratio: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollLeft = max * Math.max(0, Math.min(1, ratio));
  }, []);

  const navigateRail = useCallback((clientX: number, track: HTMLElement) => {
    const rect = track.getBoundingClientRect();
    const relative = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setScrollRatio(relative);
  }, [setScrollRatio]);

  const onThumbPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const el = scrollRef.current;
    if (!el) return;
    thumbDragRef.current = { startX: event.clientX, startScroll: el.scrollLeft };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onThumbPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = thumbDragRef.current;
    const el = scrollRef.current;
    const track = event.currentTarget.parentElement;
    if (!drag || !el || !track) return;

    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const travel = track.clientWidth * Math.max(0, 1 - scrollMetrics.thumbRatio);
    if (travel <= 0) return;

    const deltaX = event.clientX - drag.startX;
    el.scrollLeft = Math.max(0, Math.min(max, drag.startScroll + (deltaX / travel) * max));
  }, [scrollMetrics.thumbRatio]);

  const onThumbPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    thumbDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

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

  const resetScrollPosition = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    scrollToBoardStart(scroller, dir);
    requestAnimationFrame(syncScrollUi);
  }, [dir, syncScrollUi]);

  const pipelineReady = !grouped.some((column) => column.loading);

  useEffect(() => {
    if (!pipelineReady) return;
    const outer = requestAnimationFrame(() => {
      requestAnimationFrame(resetScrollPosition);
    });
    return () => cancelAnimationFrame(outer);
  }, [pipelineReady, stages.length, showClosed, dir, resetScrollPosition]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => syncScrollUi();
    const ro = new ResizeObserver(() => {
      syncScrollUi();
    });

    el.addEventListener('scroll', onScroll, { passive: true });
    ro.observe(el);
    syncScrollUi();

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [dir, resetScrollPosition, syncScrollUi]);

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
      >
        <button
          type="button"
          className="admissions-kanban-scroll-rail__nav admissions-kanban-scroll-rail__nav--end"
          aria-label={t('admin.admissions.kanban.scrollForward')}
          hidden={!canScrollForward}
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
          hidden={!canScrollBack}
          onClick={scrollTowardPipelineStart}
        >
          ›
        </button>
      </div>
    );
  }

  return (
    <div className="admissions-kanban-outer">
      <div className="admissions-kanban-board">
        <div className="admissions-kanban-board__head">
          <p className="admissions-kanban-hint muted">{t('admin.admissions.kanban.uiStageHint')}</p>
          {canScrollForward ? (
            <p className="admissions-kanban-scroll-hint muted">{t('admin.admissions.kanban.scrollHint')}</p>
          ) : null}
        </div>

        {scrollMetrics.overflow ? renderScrollRail('top') : null}

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
          >
            <div className="admissions-kanban" data-pipeline-start={firstColumnLabel} data-dir={dir}>
              {grouped.map(({ stage, items: columnItems, total, hasMore, loadingMore, loading }) => (
                <section
                  key={stage}
                  className={cn(
                    'admissions-kanban__column',
                    stage === stages[0] && 'admissions-kanban__column--first',
                  )}
                  data-stage={stage}
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
                        <AdmissionCard key={item.id} item={item} showStateBadge={false} />
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
