import { expect, it } from 'vitest';
import { resolveAdmissionJourneySteps } from './admission-journey-steps';

it('41-44. journey starts with five canonical steps', () => {
  const steps = resolveAdmissionJourneySteps({ processing_stage: 'assessment_in_progress', assessment_progress: 'in_progress', state: 'under_review' });
  expect(steps).toHaveLength(5);
  expect(steps.map((s) => s.id)).toEqual(['follow_up', 'assessment', 'decision', 'acceptance', 'registration']);
  expect(steps.find((s) => s.id === 'assessment')?.status).toBe('current');
});
