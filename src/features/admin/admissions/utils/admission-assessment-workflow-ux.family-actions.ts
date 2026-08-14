import { expect, it } from 'vitest';
import { normalizeAdmissionListItem } from './normalize-admission-record';
import { resolveAdmissionPrimaryAction } from './admission-primary-action';
import { ALL_ACTIONS } from './admission-assessment-workflow-ux.test-support';
import { listFixture } from './admission-assessment-workflow-ux.family-fixture';
it('83-88. family child primary actions stay independent', () => {
  const a = normalizeAdmissionListItem(listFixture(10, { processing_stage: 'new', assessment_progress: 'not_started', offer_required: false, registration_readiness: 'not_applicable' }));
  const b = normalizeAdmissionListItem(listFixture(11, { state: 'accepted', processing_stage: 'decision_ready', assessment_progress: 'completed', offer_required: true, registration_readiness: 'awaiting_offer_creation', offer_state: 'not_created' }));
  const pa = resolveAdmissionPrimaryAction({ ...a, allowed_actions: ALL_ACTIONS });
  const pb = resolveAdmissionPrimaryAction({ ...b, decision: { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null }, allowed_actions: ALL_ACTIONS });
  expect(pa.key).not.toBe(pb.key);
});
