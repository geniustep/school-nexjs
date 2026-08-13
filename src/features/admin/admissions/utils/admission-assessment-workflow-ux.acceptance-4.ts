import { expect, it } from 'vitest';
import { resolveOfferRequired } from './admission-assessment-workflow-contract';
import { resolveAcceptanceRegistrationMode } from './admission-acceptance-registration-ux';
import type { AdmissionDetail } from '@/types/admission';
it('71-75. response modes', () => {
  const decision = { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null } as const;
  const a = resolveAcceptanceRegistrationMode({ id: 1, student_name: 'x', state: 'offer_sent', decision, offer_required: true, offer_state: 'sent', allowed_actions: {} } as AdmissionDetail);
  const b = resolveAcceptanceRegistrationMode({ id: 1, student_name: 'x', state: 'confirmed', decision, offer_state: 'declined', offer_required: true, allowed_actions: {} } as AdmissionDetail);
  expect(a).toBe('offer_sent');
  expect(b).toBe('offer_declined');
  expect(resolveOfferRequired({ offer_required: false })).toBe(false);
});
