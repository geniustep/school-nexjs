import { describe, expect, it } from 'vitest';
import {
  hasPostSetupReview,
  isPostSetupComplete,
  readBackendPostSetupProgress,
  type StudentPostSetupStatus,
} from './student-post-setup';

describe('student post-setup contract', () => {
  it('uses backend progress values instead of recomputing from step statuses', () => {
    const status: StudentPostSetupStatus = {
      progress: { completed_steps: 1, total_steps: 3, percent: 33 },
      steps: [
        { key: 'class_assignment', status: 'completed', processed: true },
        { key: 'account', status: 'completed', processed: true },
        { key: 'financial_plan', status: 'pending', processed: false },
      ],
    };
    expect(readBackendPostSetupProgress(status)).toEqual({
      completed_steps: 1,
      total_steps: 3,
      percent: 33,
    });
  });

  it('treats 100 percent as complete and preserves review outcomes', () => {
    const status: StudentPostSetupStatus = {
      progress: { completed_steps: 3, total_steps: 3, percent: 100 },
      steps: [
        { key: 'class_assignment', status: 'completed', processed: true },
        { key: 'account', status: 'completed', processed: true },
        { key: 'financial_plan', status: 'ambiguous', processed: true },
      ],
    };
    expect(isPostSetupComplete(status)).toBe(true);
    expect(hasPostSetupReview(status)).toBe(true);
  });

  it('rejects malformed progress instead of inventing a local percentage', () => {
    expect(readBackendPostSetupProgress({ progress: { completed_steps: 1, total_steps: 3, percent: Number.NaN } })).toBeNull();
  });
});
