import { expect, it } from 'vitest';
import { resolveAdmissionPrimaryAction } from './admission-primary-action';
import { ALL_ACTIONS } from './admission-assessment-workflow-ux.test-support';

it('59-60. registration readiness cases', () => {
  const a = resolveAdmissionPrimaryAction({ id: 1, state: 'confirmed', registration_readiness: 'ready', allowed_actions: ALL_ACTIONS });
  const b = resolveAdmissionPrimaryAction({ id: 1, state: 'accepted', decision: 'accepted', offer_required: false, allowed_actions: ALL_ACTIONS });
  expect(a.key).toBe('continue_registration');
  expect(b.key).toBe('mark_ready_for_registration');
});
