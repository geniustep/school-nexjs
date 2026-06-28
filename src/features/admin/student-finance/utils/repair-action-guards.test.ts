import { describe, expect, it } from 'vitest';
import {
  canExecuteRepairAction,
  validateRepairApply,
} from './repair-action-guards';

describe('canExecuteRepairAction', () => {
  it('allows execution only when permitted and not blocked', () => {
    expect(canExecuteRepairAction({ isBlocked: false }, true)).toBe(true);
  });

  it('hides execution for a blocked action even with permission', () => {
    expect(canExecuteRepairAction({ isBlocked: true }, true)).toBe(false);
  });

  it('hides execution when the admin cannot apply actions', () => {
    expect(canExecuteRepairAction({ isBlocked: false }, false)).toBe(false);
  });
});

describe('validateRepairApply', () => {
  it('blocks apply when a required reason is missing', () => {
    const result = validateRepairApply({
      requiresReason: true,
      requiresConfirmation: false,
      reason: '   ',
      confirmed: false,
    });
    expect(result.ok).toBe(false);
    expect(result.errorKey).toContain('reasonRequired');
  });

  it('blocks apply when a required confirmation is not ticked', () => {
    const result = validateRepairApply({
      requiresReason: false,
      requiresConfirmation: true,
      reason: '',
      confirmed: false,
    });
    expect(result.ok).toBe(false);
    expect(result.errorKey).toContain('confirmRequired');
  });

  it('passes when reason and confirmation requirements are satisfied', () => {
    const result = validateRepairApply({
      requiresReason: true,
      requiresConfirmation: true,
      reason: 'تنظيف الخطط المتداخلة',
      confirmed: true,
    });
    expect(result.ok).toBe(true);
    expect(result.errorKey).toBeNull();
  });

  it('passes when nothing is required', () => {
    const result = validateRepairApply({
      requiresReason: false,
      requiresConfirmation: false,
      reason: '',
      confirmed: false,
    });
    expect(result.ok).toBe(true);
  });
});
