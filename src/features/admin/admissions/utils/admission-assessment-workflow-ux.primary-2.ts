import { expect, it } from 'vitest';
import { resolveAdmissionPrimaryAction } from './admission-primary-action';
import { ALL_ACTIONS } from './admission-assessment-workflow-ux.test-support';

it('55-56. next two cases', () => {
  const a = resolveAdmissionPrimaryAction({ id: 1, processing_stage: 'assessment_in_progress', assessment_progress: 'in_progress', allowed_actions: ALL_ACTIONS });
  const b = resolveAdmissionPrimaryAction({ id: 1, processing_stage: 'decision_ready', allowed_actions: ALL_ACTIONS });
  expect(a.key).toBe('open_assessments');
  expect(b.key).toBe('decide');
});
