import { expect, it } from 'vitest';
import { resolveAdmissionPrimaryAction } from './admission-primary-action';
import { ALL_ACTIONS } from './admission-assessment-workflow-ux.test-support';

it('52-54. first three cases', () => {
  const a = resolveAdmissionPrimaryAction({ id: 1, processing_stage: 'new', state: 'new', allowed_actions: ALL_ACTIONS });
  const b = resolveAdmissionPrimaryAction({ id: 1, processing_stage: 'initial_follow_up', state: 'contacted', allowed_actions: ALL_ACTIONS });
  const c = resolveAdmissionPrimaryAction({ id: 1, processing_stage: 'assessment_ready', assessment_progress: 'not_started', allowed_actions: ALL_ACTIONS });
  expect(a.key).toBe('follow_up_start');
  expect(b.key).toBe('follow_up_advance');
  expect(c.key).toBe('schedule_assessment');
});
