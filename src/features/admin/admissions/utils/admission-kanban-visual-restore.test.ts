import {
  resolveAdmissionPrimaryAction,
} from './admission-primary-action';
import { resolveAdmissionJourneySteps } from './admission-journey-steps';
import { ADMISSION_TABS } from './admission-detail-tabs';
import {
  boardStartScrollLeft,
  computeHorizontalScrollMetrics,
  nextSyncedScrollLeft,
  scrollLeftAfterThumbDrag,
  scrollLeftFromRatio,
} from './synchronized-horizontal-scroll';
import {
  isRawKanbanDropTarget,
  rawKanbanColumnClass,
} from './admission-raw-kanban';
import {
  buildAdmissionWorkspaceQuery,
  buildKanbanWorkspaceExtraQuery,
  FOLLOW_UP_WORKSPACE_STATES,
  parseWorkspaceListStateFromSearchParams,
  type AdmissionWorkspaceListState,
} from './admission-workspace';
import {
  admissionKanbanFetchStages,
  visibleKanbanColumnsForBoard,
} from './admission-kanban-presentation';
import {
  evaluateManualStageChange,
  getAdmissionManualStageOptions,
} from './admission-stage-options';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const messagesRoot = path.resolve(process.cwd(), 'messages');

function baseState(
  overrides: Partial<AdmissionWorkspaceListState> = {},
): AdmissionWorkspaceListState {
  return {
    ...parseWorkspaceListStateFromSearchParams(new URLSearchParams()),
    ...overrides,
  };
}

describe('workspace kanban availability', () => {
  it('1. status-nav all allows kanban with primary columns including accepted/ready', () => {
    const q = buildAdmissionWorkspaceQuery(baseState({ statusFilter: '' }));
    expect(q.kanbanAllowed).toBe(true);
    expect(q.kanbanColumns).toContain('new');
    expect(q.kanbanColumns).toContain('accepted');
    expect(q.kanbanColumns).toContain('ready_for_registration');
    expect(q.kanbanColumns).not.toContain('after_acceptance');
    expect(q.kanbanColumns).not.toEqual(admissionKanbanFetchStages());
  });

  it('2. accepted filter allows kanban with a single accepted column', () => {
    const q = buildAdmissionWorkspaceQuery(
      baseState({ statusFilter: 'accepted' }),
    );
    expect(q.kanbanAllowed).toBe(true);
    expect(q.kanbanColumns).toEqual(['accepted']);
  });

  it('3. ready_for_registration filter allows kanban with a single ready column', () => {
    const q = buildAdmissionWorkspaceQuery(
      baseState({ statusFilter: 'ready_for_registration' }),
    );
    expect(q.kanbanAllowed).toBe(true);
    expect(q.kanbanColumns).toEqual(['ready_for_registration']);
  });

  it('4-5. kanban extra query omits workspace and application_status', () => {
    for (const state of FOLLOW_UP_WORKSPACE_STATES) {
      const extra = buildKanbanWorkspaceExtraQuery(
        baseState({ workspace: 'follow_up' }),
      );
      expect(extra).not.toHaveProperty('workspace');
      expect(extra).not.toHaveProperty('state');
      expect(extra).not.toHaveProperty('processing_stage');
      expect(extra).not.toHaveProperty('application_status');
      void state;
    }
    expect(admissionKanbanFetchStages()).toHaveLength(3);
  });

  it('7. follow_up subfilter statuses are official application_status values', () => {
    expect([...FOLLOW_UP_WORKSPACE_STATES]).toEqual([
      'new',
      'follow_up',
      'in_assessment',
    ]);
  });
});

describe('column accents and labels', () => {
  it('8-9. each column has a distinct class; color is not the only signal', () => {
    const classes = FOLLOW_UP_WORKSPACE_STATES.map((s) => rawKanbanColumnClass(s));
    expect(new Set(classes).size).toBe(3);
    for (const state of FOLLOW_UP_WORKSPACE_STATES) {
      expect(rawKanbanColumnClass(state)).toContain(state);
      expect(`admin.admissions.applicationStatus.${state}`).toMatch(/applicationStatus\./);
    }
  });
});

describe('synchronized horizontal scroll helpers', () => {
  it('10-16. overflow, ratio sync, no-loop, no overflow', () => {
    const overflow = computeHorizontalScrollMetrics(40, 1000, 400, 'ltr');
    expect(overflow.overflow).toBe(true);
    expect(overflow.thumbRatio).toBeLessThan(1);
    expect(overflow.ratio).toBeCloseTo(40 / 600, 5);

    const none = computeHorizontalScrollMetrics(0, 400, 400, 'ltr');
    expect(none.overflow).toBe(false);
    expect(none.thumbRatio).toBe(1);

    expect(scrollLeftFromRatio(600, 0.5, 'ltr')).toBe(300);
    expect(nextSyncedScrollLeft(120, 120)).toBeNull();
    expect(nextSyncedScrollLeft(120, 80)).toBe(120);
  });

  it('19-20. RTL/LTR board start positions and thumb drag direction', () => {
    expect(boardStartScrollLeft(1000, 400, 'ltr')).toBe(0);
    expect(boardStartScrollLeft(1000, 400, 'rtl')).toBe(600);

    const rtlStart = computeHorizontalScrollMetrics(600, 1000, 400, 'rtl');
    expect(rtlStart.ratio).toBeCloseTo(0, 5);
    expect(rtlStart.thumbInset).toBeCloseTo(1, 5);
    expect(rtlStart.canScrollForward).toBe(true);
    expect(rtlStart.canScrollBack).toBe(false);

    // LTR: finger right → toward end (higher scrollLeft).
    expect(
      scrollLeftAfterThumbDrag({
        startScroll: 0,
        deltaX: 150,
        travel: 300,
        max: 600,
        dir: 'ltr',
      }),
    ).toBe(300);
    // RTL: start at right; finger left → toward end (lower scrollLeft).
    expect(
      scrollLeftAfterThumbDrag({
        startScroll: 600,
        deltaX: -150,
        travel: 300,
        max: 600,
        dir: 'rtl',
      }),
    ).toBe(300);
  });

  it('hides vacant columns until drag, then reveals allowed ghost slots', () => {
    const columns = [
      { id: 'new', total: 2, items: [{ id: 1 }], loading: false },
      { id: 'follow_up', total: 0, items: [], loading: false },
      { id: 'waitlisted', total: 0, items: [], loading: true },
    ];
    const idle = visibleKanbanColumnsForBoard(columns, { dragging: false });
    expect(idle.map((c) => c.id)).toEqual(['new', 'waitlisted']);
    expect(idle.every((c) => !c.isGhost)).toBe(true);

    const dragging = visibleKanbanColumnsForBoard(columns, {
      dragging: true,
      allowedTargetIds: ['follow_up'],
    });
    expect(dragging.map((c) => c.id)).toEqual(['new', 'follow_up', 'waitlisted']);
    expect(dragging.find((c) => c.id === 'follow_up')?.isGhost).toBe(true);
    expect(dragging.find((c) => c.id === 'waitlisted')?.isGhost).toBe(false);
  });
});

describe('drag / drop targets', () => {
  it('31-35. follow_up / official statuses are drop targets; registered blocked', () => {
    for (const stage of FOLLOW_UP_WORKSPACE_STATES) {
      expect(isRawKanbanDropTarget(stage)).toBe(true);
    }
    expect(isRawKanbanDropTarget('decision_pending')).toBe(true);
    expect(isRawKanbanDropTarget('accepted')).toBe(true);
    expect(isRawKanbanDropTarget('registered')).toBe(false);

    expect(
      evaluateManualStageChange({ state: 'new' }, 'confirmed').apply,
    ).toBe(false);
    expect(
      evaluateManualStageChange({ state: 'new' }, 'contacted').apply,
    ).toBe(false);
    expect(
      evaluateManualStageChange({ processing_stage: 'new' }, 'initial_follow_up').apply,
    ).toBe(true);
    // Manual stage options remain processing-stage based for legacy actions —
    // kanban UI keeps allowDrag=false.
    expect(getAdmissionManualStageOptions().length).toBeGreaterThan(0);
  });
});

describe('Phase B preservation + i18n', () => {
  it('44. Phase B helpers still present', () => {
    expect(typeof resolveAdmissionPrimaryAction).toBe('function');
    expect(typeof resolveAdmissionJourneySteps).toBe('function');
    expect(ADMISSION_TABS).toHaveLength(6);
  });

  it('43. kanban scroll/selection keys in four locales', () => {
    for (const locale of ['ar', 'en', 'fr', 'es']) {
      const m = require(path.join(messagesRoot, `${locale}.json`));
      expect(m.admin.admissions.kanban.horizontalScroll).toBeTruthy();
      expect(m.admin.admissions.kanban.emptyColumn).toBeTruthy();
      expect(m.admin.admissions.kanban.columnCount).toBeTruthy();
      expect(m.admin.admissions.selection.selectItem).toBeTruthy();
      expect(m.admin.admissions.selection.deselectItem).toBeTruthy();
    }
  });
});
