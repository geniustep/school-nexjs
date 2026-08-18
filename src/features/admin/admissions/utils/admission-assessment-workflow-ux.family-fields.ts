import { expect, it } from 'vitest';
import { normalizeAdmissionListItem } from './normalize-admission-record';
import { listFixture } from './admission-assessment-workflow-ux.family-fixture';
it('79-82. family child fields stay independent', () => {
  const a = normalizeAdmissionListItem(listFixture(10, { processing_stage: 'new', assessment_progress: 'not_started', offer_required: false, registration_readiness: 'not_applicable' }));
  const b = normalizeAdmissionListItem(listFixture(11, { state: 'accepted', processing_stage: 'decision_ready', assessment_progress: 'completed', offer_required: true, registration_readiness: 'awaiting_offer_creation', offer_state: 'not_created' }));
  expect(a.processing_stage).not.toBe(b.processing_stage);
  expect(a.assessment_progress).not.toBe(b.assessment_progress);
  expect(a.offer_required).not.toBe(b.offer_required);
  expect(a.registration_readiness).not.toBe(b.registration_readiness);
});
