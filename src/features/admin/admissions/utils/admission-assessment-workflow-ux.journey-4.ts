import { expect, it } from 'vitest';
import { resolveAdmissionJourneySteps } from './admission-journey-steps';

it('50. offer response path', () => {
  const sent = resolveAdmissionJourneySteps({ decision: { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null }, offer_required: true, offer_state: 'sent', registration_readiness: 'awaiting_offer_response', state: 'offer_sent' });
  expect(sent.find((s) => s.id === 'acceptance')?.status).toBe('current');
  const accepted = resolveAdmissionJourneySteps({ decision: { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null }, offer_required: true, offer_state: 'accepted', registration_readiness: 'ready', state: 'confirmed' });
  expect(accepted.find((s) => s.id === 'acceptance')?.status).toBe('complete');
  expect(accepted.find((s) => s.id === 'registration')?.status).toBe('current');
});
