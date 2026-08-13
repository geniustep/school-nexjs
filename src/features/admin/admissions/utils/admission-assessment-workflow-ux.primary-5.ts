import { expect, it } from 'vitest';
import { resolveAdmissionPrimaryAction } from './admission-primary-action';
import { ALL_ACTIONS } from './admission-assessment-workflow-ux.test-support';
it('61. case', () => {
  const result = resolveAdmissionPrimaryAction({ id: 1, student_id: 44, registration_readiness: 'registered', allowed_actions: ALL_ACTIONS });
  expect(result.key).toBe('open_student');
});
