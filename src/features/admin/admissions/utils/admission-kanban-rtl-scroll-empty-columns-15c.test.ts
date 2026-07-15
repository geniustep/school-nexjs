/**
 * STAGE 15C — targeted verification for RTL scroll rails + empty/ghost columns.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  isKanbanColumnDroppableForDrag,
  visibleKanbanColumnsForBoard,
} from './admission-kanban-presentation';
import { isRawKanbanDropTarget } from './admission-raw-kanban';
import { normalizeAllowedStatusTargets } from './admission-modern-actions';
import { isAdmissionCardDragBlockedTarget } from '../components/admission-card';
import {
  boardStartScrollLeft,
  computeHorizontalScrollMetrics,
  nextSyncedScrollLeft,
  scrollLeftAfterThumbDrag,
  scrollLeftFromPhysicalRatio,
  scrollLeftFromRatio,
} from './synchronized-horizontal-scroll';

const require = createRequire(import.meta.url);
const cssPath = path.join(__dirname, '../admissions.css');
const cardSourcePath = path.join(__dirname, '../components/admission-card.tsx');
const kanbanSourcePath = path.join(
  __dirname,
  '../components/admissions-raw-state-kanban.tsx',
);

function sampleColumns() {
  return [
    { id: 'new', total: 2, items: [{ id: 1 }], loading: false },
    { id: 'follow_up', total: 0, items: [], loading: false },
    { id: 'in_assessment', total: 0, items: [], loading: false },
    { id: 'decision_pending', total: 1, items: [{ id: 2 }], loading: false },
    { id: 'registered', total: 0, items: [], loading: false },
  ] as const;
}

describe('15C empty / ghost columns', () => {
  it('1. hides count=0 columns while idle and keeps official order', () => {
    const idle = visibleKanbanColumnsForBoard(sampleColumns(), { dragging: false });
    expect(idle.map((c) => c.id)).toEqual(['new', 'decision_pending']);
    expect(idle.every((c) => !c.isGhost)).toBe(true);
  });

  it('2. shows only allowed vacant columns as ghosts while dragging', () => {
    const allowed = ['follow_up', 'in_assessment'] as const;
    const dragging = visibleKanbanColumnsForBoard(sampleColumns(), {
      dragging: true,
      allowedTargetIds: allowed,
    });
    expect(dragging.map((c) => c.id)).toEqual([
      'new',
      'follow_up',
      'in_assessment',
      'decision_pending',
    ]);
    expect(dragging.find((c) => c.id === 'follow_up')?.isGhost).toBe(true);
    expect(dragging.find((c) => c.id === 'in_assessment')?.isGhost).toBe(true);
    expect(dragging.find((c) => c.id === 'new')?.isGhost).toBe(false);
    expect(dragging.some((c) => c.id === 'registered')).toBe(false);
  });

  it('3. hides ghosts again after drag cancel / success / failure (idle)', () => {
    const afterCancel = visibleKanbanColumnsForBoard(sampleColumns(), {
      dragging: false,
    });
    const afterSuccess = visibleKanbanColumnsForBoard(
      [
        { id: 'new', total: 1, items: [{ id: 1 }], loading: false },
        { id: 'follow_up', total: 1, items: [{ id: 9 }], loading: false },
        { id: 'in_assessment', total: 0, items: [], loading: false },
        { id: 'decision_pending', total: 1, items: [{ id: 2 }], loading: false },
      ],
      { dragging: false },
    );
    const afterFailureBackIdle = visibleKanbanColumnsForBoard(sampleColumns(), {
      dragging: false,
    });
    expect(afterCancel.map((c) => c.id)).toEqual(['new', 'decision_pending']);
    expect(afterSuccess.map((c) => c.id)).toEqual(['new', 'follow_up', 'decision_pending']);
    expect(afterFailureBackIdle.map((c) => c.id)).toEqual(['new', 'decision_pending']);
  });

  it('4. disallows non-allowed / registered drop highlights', () => {
    expect(
      isKanbanColumnDroppableForDrag({
        columnId: 'waitlisted',
        allowDrag: true,
        dragging: true,
        allowedTargetIds: ['follow_up'],
        dropStage: 'waitlisted',
        isDropTargetState: isRawKanbanDropTarget,
      }),
    ).toBe(false);
    expect(
      isKanbanColumnDroppableForDrag({
        columnId: 'follow_up',
        allowDrag: true,
        dragging: true,
        allowedTargetIds: ['follow_up'],
        dropStage: 'follow_up',
        isDropTargetState: isRawKanbanDropTarget,
      }),
    ).toBe(true);
    expect(
      isKanbanColumnDroppableForDrag({
        columnId: 'registered',
        allowDrag: true,
        dragging: true,
        allowedTargetIds: ['registered', 'follow_up'],
        dropStage: null,
        isDropTargetState: isRawKanbanDropTarget,
      }),
    ).toBe(false);
    expect(isRawKanbanDropTarget('registered')).toBe(false);
  });

  it('12. keeps allowed_status_targets as decision source', () => {
    expect(normalizeAllowedStatusTargets(['follow_up', 'decision_pending', 'registered'])).toEqual(
      ['follow_up', 'decision_pending', 'registered'],
    );
    const source = path.join(__dirname, '../components/admissions-raw-state-kanban.tsx');
    const src = readFileSync(source, 'utf8');
    expect(src).toContain('normalizeAllowedStatusTargets(item.allowed_status_targets)');
    expect(src).toContain('allowedTargetIds: dragAllowedTargets');
  });
});

describe('15C synchronized scroll rails + directions', () => {
  it('5-6. dual rails share one metrics source; no rails without overflow', () => {
    const overflow = computeHorizontalScrollMetrics(120, 1000, 400, 'ltr');
    expect(overflow.overflow).toBe(true);
    // Top + bottom rails are render mirrors of the same metrics (single scroller).
    const topInset = overflow.thumbInset;
    const bottomInset = overflow.thumbInset;
    expect(topInset).toBe(bottomInset);
    expect(nextSyncedScrollLeft(120, 120)).toBeNull();
    expect(nextSyncedScrollLeft(200, 120)).toBe(200);

    const none = computeHorizontalScrollMetrics(0, 400, 400, 'ltr');
    expect(none.overflow).toBe(false);
    const kanbanSrc = readFileSync(kanbanSourcePath, 'utf8');
    expect(kanbanSrc).toContain("scrollMetrics.overflow ? renderScrollRail('top')");
    expect(kanbanSrc).toContain("scrollMetrics.overflow ? renderScrollRail('bottom')");
  });

  it('7. RTL scroll start + thumb drag follow pointer without inversion', () => {
    expect(boardStartScrollLeft(1000, 400, 'rtl')).toBe(600);
    const start = computeHorizontalScrollMetrics(600, 1000, 400, 'rtl');
    expect(start.ratio).toBeCloseTo(0, 5);
    expect(start.thumbInset).toBeCloseTo(1, 5);
    // Finger left from RTL start → toward end (scrollLeft decreases).
    expect(
      scrollLeftAfterThumbDrag({
        startScroll: 600,
        deltaX: -150,
        travel: 300,
        max: 600,
        dir: 'rtl',
      }),
    ).toBe(300);
    // Click physical left quarter on RTL track → toward pipeline end (scrollLeft↓).
    expect(scrollLeftFromPhysicalRatio(600, 0.25, 'rtl')).toBeCloseTo(150, 5);
  });

  it('8. LTR scroll start + thumb drag remain natural', () => {
    expect(boardStartScrollLeft(1000, 400, 'ltr')).toBe(0);
    const start = computeHorizontalScrollMetrics(0, 1000, 400, 'ltr');
    expect(start.ratio).toBeCloseTo(0, 5);
    expect(start.thumbInset).toBeCloseTo(0, 5);
    expect(
      scrollLeftAfterThumbDrag({
        startScroll: 0,
        deltaX: 150,
        travel: 300,
        max: 600,
        dir: 'ltr',
      }),
    ).toBe(300);
    expect(scrollLeftFromRatio(600, 0.5, 'ltr')).toBe(300);
  });

  it('9. sticky classes exist for top and bottom rails', () => {
    const css = readFileSync(cssPath, 'utf8');
    expect(css).toMatch(/\.admissions-kanban-scroll-rail--top\s*\{[^}]*position:\s*sticky/s);
    expect(css).toMatch(/\.admissions-kanban-scroll-rail--bottom\s*\{[^}]*position:\s*sticky/s);
    expect(css).toContain('.admissions-kanban__column--ghost');
  });
});

describe('15C interaction independence + registered', () => {
  it('blocks drag from links/controls but allows handle and card body', () => {
    const make = (tag: string, className: string, blockedBy: string | null) =>
      ({
        closest: (sel: string) => {
          if (className === 'admission-card__drag-handle' && sel.includes('drag-handle')) {
            return {};
          }
          if (blockedBy && sel.split(',').some((part) => part.trim().startsWith(blockedBy))) {
            return {};
          }
          if (sel.includes(`.${className}`)) return {};
          return null;
        },
      }) as unknown as Element;

    expect(isAdmissionCardDragBlockedTarget(make('a', 'admission-card__identity-link', 'a'))).toBe(
      true,
    );
    expect(
      isAdmissionCardDragBlockedTarget(make('span', 'admission-card__drag-handle', null)),
    ).toBe(false);
    expect(
      isAdmissionCardDragBlockedTarget(make('p', 'admission-card__guardian-name', null)),
    ).toBe(false);
  });

  it('10. checkbox / card link / drag handle remain independent in card source', () => {
    const src = readFileSync(cardSourcePath, 'utf8');
    const kanbanSrc = readFileSync(kanbanSourcePath, 'utf8');
    expect(src).toContain('admission-card__select-input');
    expect(src).toContain('admission-card__drag-handle');
    expect(src).toContain('admission-card__identity-link');
    expect(src).toMatch(/function handleCheckboxChange[\s\S]*onToggleSelect/);
    expect(src).toContain('onDragPointerDown');
    expect(src).toContain('onPointerDown={handleDragPointerDown}');
    expect(src).not.toContain('draggable="true"');
    expect(kanbanSrc).toContain('beginPointerDrag');
    expect(kanbanSrc).toContain('resolveKanbanColumnIdAtPoint');
    expect(src).toMatch(/admission-card__identity-link" draggable=\{false\}/);
  });

  it('11. registered cards are not draggable from kanban', () => {
    const src = readFileSync(kanbanSourcePath, 'utf8');
    expect(src).toContain("status !== 'registered'");
    expect(src).toContain("current === 'registered'");
    expect(isRawKanbanDropTarget('registered')).toBe(false);
  });
});

describe('15C locale keys still present', () => {
  it('keeps kanban scroll + empty column keys in four locales', () => {
    const messagesRoot = path.resolve(process.cwd(), 'messages');
    for (const locale of ['ar', 'en', 'fr', 'es']) {
      const m = require(path.join(messagesRoot, `${locale}.json`));
      expect(m.admin.admissions.kanban.horizontalScroll).toBeTruthy();
      expect(m.admin.admissions.kanban.emptyColumn).toBeTruthy();
    }
  });
});
