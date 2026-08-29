import { describe, expect, it } from 'vitest';
import { classDistributionEndpoints } from './class-distribution-endpoints';

describe('class distribution endpoints', () => {
  it('keeps read and mutation paths centralized under lib/api', () => {
    expect(classDistributionEndpoints.read).toBe('/admin/class-distribution');
    expect(classDistributionEndpoints.assign).toBe('/admin/class-distribution/assign');
  });
});
