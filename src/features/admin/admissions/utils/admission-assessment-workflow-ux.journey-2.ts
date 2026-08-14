import { expect, it } from 'vitest';
import { resolveAdmissionJourneySteps } from './admission-journey-steps';

it('45-46. journey stage transition', () => {
  const x = resolveAdmissionJourneySteps({ processing_stage: 'decision_ready', assessment_progress: 'ready_for_decision', state: 'under_review' });
  expect(x.find((s) => s.id === 'assessment')?.status).toBe('complete');
  expect(x.find((s) => s.id === 'decision')?.status).toBe('current');
});
