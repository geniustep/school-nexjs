import { expect, it } from 'vitest';
import { resolveAdmissionJourneySteps } from './admission-journey-steps';

it('51. registration completion needs the registered signal', () => {
  const registered = resolveAdmissionJourneySteps({ student_id: 9, registration_readiness: 'registered', offer_state: 'accepted', decision: { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null }, state: 'confirmed' });
  expect(registered.find((s) => s.id === 'registration')?.status).toBe('complete');
  const offerOnly = resolveAdmissionJourneySteps({ decision: { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null }, offer_required: true, offer_state: 'accepted', registration_readiness: 'ready', state: 'confirmed' });
  expect(offerOnly.find((s) => s.id === 'registration')?.status).not.toBe('complete');
});
