import { expect, it } from 'vitest';
import { resolveAdmissionJourneySteps } from './admission-journey-steps';

it('47-49. terminal and direct-registration paths', () => {
  const a = resolveAdmissionJourneySteps({ decision: { decision: 'rejected', decision_date: null, decision_user: null, decision_notes: null, conditions: null }, is_school_rejected: true, state: 'lost' });
  expect(a.find((s) => s.id === 'acceptance')?.status).toBe('not_applicable');
  const b = resolveAdmissionJourneySteps({ decision: { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null }, offer_required: false, offer_state: 'not_applicable', registration_readiness: 'ready', state: 'accepted' });
  expect(b.find((s) => s.id === 'acceptance')?.status).toBe('complete');
  expect(b.find((s) => s.id === 'registration')?.status).toBe('current');
});
