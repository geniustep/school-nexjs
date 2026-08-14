import { expect, it } from 'vitest';
import { primaryActionExcludesSecondary, resolveAdmissionPrimaryAction, resolveAdmissionSecondaryActions } from './admission-primary-action';
import { ALL_ACTIONS } from './admission-assessment-workflow-ux.test-support';
it('62. single-primary invariant', () => {
  const input = { id: 1, processing_stage: 'new' as const, state: 'new', allowed_actions: ALL_ACTIONS };
  const primary = resolveAdmissionPrimaryAction(input);
  const secondary = resolveAdmissionSecondaryActions(input, primary);
  expect(primaryActionExcludesSecondary(primary, secondary)).toBe(true);
});
