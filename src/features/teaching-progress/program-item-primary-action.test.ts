import { describe, expect, it } from 'vitest';
import {
  getTeacherProgramItemPrimaryAction,
  getTeacherProgramItemSecondaryActions,
} from '@/features/teaching-progress/program-item-primary-action';
import type { TeacherProgramItemView } from '@/features/teaching-progress/merge-program-items';

function item(overrides: Partial<TeacherProgramItemView> = {}): TeacherProgramItemView {
  return {
    distribution_line_id: 101,
    title: 'Item',
    sequence_order: 1,
    eligibility: true,
    remaining_units: 1,
    delivered_session_units: 0,
    ...overrides,
  };
}

describe('getTeacherProgramItemPrimaryAction', () => {
  it('documents past session when occurrence target exists', () => {
    const action = getTeacherProgramItemPrimaryAction({
      item: item({ needs_documentation: true, occurrence_id: 9 }),
      classId: 10,
      offeringId: 20,
      allowedActions: { accept_suggestion: true },
    });
    expect(action.kind).toBe('document_session');
    expect(action.href).toContain('/teacher/sessions/9?tab=delivery');
  });

  it('continues partial item with valid session target', () => {
    const action = getTeacherProgramItemPrimaryAction({
      item: item({ is_partial: true, occurrence_id: 8 }),
      classId: 10,
      offeringId: 20,
    });
    expect(action.kind).toBe('continue_item');
    expect(action.href).toContain('tab=delivery');
  });

  it('continues jathatha draft via jathatha id', () => {
    const action = getTeacherProgramItemPrimaryAction({
      item: item({ jathatha_state: 'draft', teacher_jathatha_id: 55 }),
      classId: 10,
      offeringId: 20,
    });
    expect(action.kind).toBe('continue_prep');
    expect(action.href).toBe('/teacher/jathathas/55');
  });

  it('opens ready session', () => {
    const action = getTeacherProgramItemPrimaryAction({
      item: item({ jathatha_state: 'ready', occurrence_id: 7 }),
      classId: 10,
      offeringId: 20,
    });
    expect(action.kind).toBe('open_session');
  });

  it('creates correction when flagged with delivery id', () => {
    const action = getTeacherProgramItemPrimaryAction({
      item: item({ create_correction: true, actual_delivery_id: 33 }),
      classId: 10,
      offeringId: 20,
    });
    expect(action.kind).toBe('create_correction');
    expect(action.href).toBe('/teacher/actual-deliveries/33');
  });

  it('opens prep for not-started with occurrence', () => {
    const action = getTeacherProgramItemPrimaryAction({
      item: item({ occurrence_id: 4 }),
      classId: 10,
      offeringId: 20,
    });
    expect(action.kind).toBe('open_prep');
  });

  it('accepts suggestion when allowed and no session target', () => {
    const action = getTeacherProgramItemPrimaryAction({
      item: item({ is_suggested: true }),
      classId: 10,
      offeringId: 20,
      allowedActions: { accept_suggestion: true },
    });
    expect(action.kind).toBe('accept_suggestion');
    expect(action.decisionType).toBe('accept_suggestion');
  });

  it('chooses postponed when allowed', () => {
    const action = getTeacherProgramItemPrimaryAction({
      item: item({ postponed: true }),
      classId: 10,
      offeringId: 20,
      allowedActions: { choose_postponed: true },
    });
    expect(action.kind).toBe('choose_postponed');
  });

  it('waits for schedule when no target and no decision action', () => {
    const action = getTeacherProgramItemPrimaryAction({
      item: item(),
      classId: 10,
      offeringId: 20,
      allowedActions: {},
    });
    expect(action.kind).toBe('waiting_for_schedule');
  });

  it('does not expose a complete button for completed items', () => {
    const action = getTeacherProgramItemPrimaryAction({
      item: item({ completed: true, last_delivery_id: 12 }),
      classId: 10,
      offeringId: 20,
      allowedActions: { accept_suggestion: true, choose_postponed: true },
    });
    expect(action.kind).toBe('view_delivery');
    expect(action.labelKey).not.toMatch(/complete/i);
  });

  it('hides accept when already accepted for same line', () => {
    const action = getTeacherProgramItemPrimaryAction({
      item: item({ is_suggested: true }),
      classId: 10,
      offeringId: 20,
      allowedActions: { accept_suggestion: true },
      currentDecision: {
        id: 1,
        decision_type: 'accept_suggestion',
        selected_distribution_line_id: 101,
      },
    });
    expect(action.kind).not.toBe('accept_suggestion');
  });

  it('does not invent session hub href without occurrence', () => {
    const action = getTeacherProgramItemPrimaryAction({
      item: item({ is_partial: true }),
      classId: 10,
      offeringId: 20,
      allowedActions: { accept_suggestion: true },
    });
    expect(action.href).toBeUndefined();
    expect(action.kind).toBe('waiting_for_schedule');
  });
});

describe('getTeacherProgramItemSecondaryActions', () => {
  it('omits session hub links without occurrence and keeps supported decisions', () => {
    const primary = getTeacherProgramItemPrimaryAction({
      item: item({ is_suggested: true }),
      classId: 10,
      offeringId: 20,
      allowedActions: {
        accept_suggestion: true,
        select_alternative: true,
        postpone_item: true,
      },
    });
    const secondary = getTeacherProgramItemSecondaryActions({
      item: item({ is_suggested: true }),
      classId: 10,
      offeringId: 20,
      allowedActions: {
        accept_suggestion: true,
        select_alternative: true,
        postpone_item: true,
      },
      primary,
    });
    expect(secondary.some((a) => a.key === 'view_details')).toBe(true);
    expect(secondary.some((a) => a.href?.includes('/teacher/sessions/'))).toBe(false);
    expect(secondary.some((a) => a.decisionType === 'select_alternative')).toBe(true);
    expect(secondary.some((a) => a.href === '/teacher/classes/10/homeworks')).toBe(true);
  });
});
