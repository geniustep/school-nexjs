import { describe, expect, it } from 'vitest';
import { classDistributionEndpoints } from './class-distribution-endpoints';

describe('class distribution endpoints', () => {
  it('keeps V1 compatibility paths centralized under lib/api', () => {
    expect(classDistributionEndpoints.read).toBe('/admin/class-distribution');
    expect(classDistributionEndpoints.assign).toBe('/admin/class-distribution/assign');
  });

  it('exposes the governed Workspace V2 read and move contracts', () => {
    expect(classDistributionEndpoints.workspace).toBe('/admin/class-distribution/workspace');
    expect(classDistributionEndpoints.move).toBe('/admin/class-distribution/move');
  });
});
