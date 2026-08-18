import { expect, it } from 'vitest';
import { resolveAdmissionPrimaryAction } from './admission-primary-action';
import { ALL_ACTIONS } from './admission-assessment-workflow-ux.test-support';

it('57-58. post-decision cases', () => {
  const a = resolveAdmissionPrimaryAction({ id: 1, decision: { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null }, offer_required: true, offer_state: 'not_created', registration_readiness: 'awaiting_offer_creation', allowed_actions: ALL_ACTIONS });
  const b = resolveAdmissionPrimaryAction({ id: 1, offer_state: 'sent', registration_readiness: 'awaiting_offer_response', allowed_actions: ALL_ACTIONS });
  expect(a.key).toBe('create_offer');
  expect(b.key).toBe('accept_offer');
});
