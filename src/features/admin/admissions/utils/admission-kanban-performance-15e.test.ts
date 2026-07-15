/**
 * STAGE 15E / 15ER — targeted performance regressions for Kanban.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { horizontalScrollMetricsEqual } from './horizontal-scroll-metrics-equal';
import {
  shouldActivateKanbanPointerDrag,
  resolveKanbanColumnIdAtPoint,
} from './admission-kanban-pointer-drag';
import { visibleKanbanColumnsForBoard } from './admission-kanban-presentation';

const root = path.join(__dirname, '..');

describe('15E/15ER kanban performance contracts', () => {
  it('1-2. progressive per-column settle is used (not only Promise.all wall wait)', () => {
    const src = readFileSync(path.join(root, 'hooks/use-admissions-kanban-board.ts'), 'utf8');
    expect(src).toContain('Progressive settle');
    expect(src).toContain('settledCount === 1');
    expect(src).toContain('Soft refresh');
  });

  it('3-5. pointer-move does not fetch; ghost uses DOM left/top after mount', () => {
    const kanban = readFileSync(
      path.join(root, 'components/admissions-raw-state-kanban.tsx'),
      'utf8',
    );
    expect(kanban).not.toMatch(/pointermove[\s\S]{0,400}fetchAdmissions/);
    expect(kanban).toContain('beginPointerDrag');
    expect(kanban).toContain('setGhostPos');
    expect(kanban).toContain('ghostRef.current.style.left');
    expect(kanban).toContain('dropTargetRef.current !== nextTarget');
    expect(kanban).toContain("event.key === 'Escape'");
  });

  it('6. invalidate skips services catalog for change_status', () => {
    const list = readFileSync(path.join(root, 'components/admissions-list-page.tsx'), 'utf8');
    expect(list).toContain('reloadServicesCatalog');
    expect(list).toContain("reason === 'requested_services'");
  });

  it('7. secondary filters deferred until kanban shell ready', () => {
    const list = readFileSync(path.join(root, 'components/admissions-list-page.tsx'), 'utf8');
    expect(list).toContain('secondaryFiltersEnabled');
    expect(list).toContain('kanbanShellReady');
    expect(list).toContain('useAdmissionOptions({');
    expect(list).toContain('enabled: secondaryFiltersEnabled');
  });

  it('8-9. Esc cleanup + no HTML5 DnD on live path', () => {
    const kanban = readFileSync(
      path.join(root, 'components/admissions-raw-state-kanban.tsx'),
      'utf8',
    );
    const css = readFileSync(path.join(root, 'admissions.css'), 'utf8');
    expect(kanban).toContain('removeEventListener');
    expect(kanban).not.toMatch(/onDragOver=\{/);
    expect(kanban).not.toMatch(/onDrop=\{/);
    expect(css).toMatch(/\.admissions-kanban-drag-ghost\s*\{[^}]*pointer-events:\s*none/s);
    expect(css).not.toContain('transform: translate(-9999px, -9999px)');
  });

  it('10. scroll metrics equality prevents redundant setState', () => {
    const a = {
      ratio: 0.2,
      scrollRatio: 0.2,
      thumbInset: 0.2,
      thumbRatio: 0.3,
      overflow: true,
      canScrollBack: true,
      canScrollForward: true,
      max: 100,
    };
    expect(horizontalScrollMetricsEqual(a, { ...a })).toBe(true);
    expect(horizontalScrollMetricsEqual(a, { ...a, ratio: 0.21 })).toBe(false);
    const hook = readFileSync(
      path.join(root, 'hooks/use-synchronized-horizontal-scroll.ts'),
      'utf8',
    );
    expect(hook).toContain('horizontalScrollMetricsEqual');
  });

  it('11-12. empty columns idle-hidden; drag targets gated', () => {
    const columns = [
      { id: 'new', total: 1, items: [{ id: 1 }], loading: false },
      { id: 'follow_up', total: 0, items: [], loading: false },
    ];
    expect(visibleKanbanColumnsForBoard(columns, { dragging: false }).map((c) => c.id)).toEqual([
      'new',
    ]);
    const kanban = readFileSync(
      path.join(root, 'components/admissions-raw-state-kanban.tsx'),
      'utf8',
    );
    expect(kanban).toContain('dragAllowedTargets');
    expect(shouldActivateKanbanPointerDrag(0, 0, 1, 1)).toBe(false);
  });

  it('15. live path has pointer drag + memo card', () => {
    const kanban = readFileSync(
      path.join(root, 'components/admissions-raw-state-kanban.tsx'),
      'utf8',
    );
    const card = readFileSync(path.join(root, 'components/admission-card.tsx'), 'utf8');
    expect(kanban).toContain('onCardDragPointerDown');
    expect(card).toContain('onPointerDown={handleDragPointerDown}');
    expect(card).toContain('data-admission-id={item.id}');
    expect(card).toContain('memo(AdmissionCardComponent)');
    expect(card).not.toContain('draggable="true"');
  });

  it('keeps allowed_status_targets as drop decision source', () => {
    const kanban = readFileSync(
      path.join(root, 'components/admissions-raw-state-kanban.tsx'),
      'utf8',
    );
    expect(kanban).toContain('normalizeAllowedStatusTargets');
    expect(resolveKanbanColumnIdAtPoint).toBeTypeOf('function');
  });

  it('options hook supports enabled deferral', () => {
    const src = readFileSync(path.join(root, 'hooks/use-admission-options.ts'), 'utf8');
    expect(src).toContain('enabled?: boolean');
    expect(src).toContain('if (!enabled)');
  });
});
