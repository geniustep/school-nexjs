import { expect, it } from 'vitest';
import { resolveAcceptanceRegistrationMode } from './admission-acceptance-registration-ux';
import type { AdmissionDetail } from '@/types/admission';
it('67-70. accepted modes', () => {
  const decision = { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null } as const;
  const a = resolveAcceptanceRegistrationMode({ id: 1, student_name: 'x', state: 'accepted', decision, offer_required: false, offer_state: 'not_applicable', allowed_actions: {} } as AdmissionDetail);
  const b = resolveAcceptanceRegistrationMode({ id: 1, student_name: 'x', state: 'accepted', decision, offer_required: true, offer_state: 'not_created', allowed_actions: {} } as AdmissionDetail);
  expect(a).toBe('accepted_no_offer');
  expect(b).toBe('offer_required_not_created');
});
