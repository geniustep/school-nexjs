import { describe, expect, it } from 'vitest';
import {
  GRADEBOOK_LIFECYCLE_ACTIONS,
  canEditGradebookEntries,
  hasGradebookAllowedAction,
  normalizeGradebookAllowedActions,
  visibleGradebookLifecycleActions,
} from './gradebook-allowed-actions';

describe('gradebook-allowed-actions', () => {
  it('normalizes array allowed_actions from API', () => {
    expect(normalizeGradebookAllowedActions(['open', 'submit'])).toEqual({
      open: true,
      submit: true,
    });
  });

  it('renders actions only when backend allows them', () => {
    const actions = { open: true, submit: false, lock: true };
    expect(hasGradebookAllowedAction(actions, 'open')).toBe(true);
    expect(hasGradebookAllowedAction(actions, 'submit')).toBe(false);
    expect(GRADEBOOK_LIFECYCLE_ACTIONS.filter((action) => hasGradebookAllowedAction(actions, action))).toEqual([
      'open',
      'lock',
    ]);
  });

  it('teacher catalog exposes submit only and gates edit_entries', () => {
    const actions = {
      edit_entries: true,
      submit: true,
      build_roster: true,
      publish: true,
    };
    expect(visibleGradebookLifecycleActions('teacher', actions)).toEqual(['submit']);
    expect(canEditGradebookEntries('teacher', actions)).toBe(true);
    expect(canEditGradebookEntries('teacher', { submit: true })).toBe(false);
  });
});
