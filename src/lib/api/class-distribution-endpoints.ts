/**
 * Isolated endpoint slice for the governed class-distribution contracts.
 * V1 paths remain available for backward compatibility while Workspace V2
 * becomes the page's primary read/mutation surface.
 */
export const classDistributionEndpoints = {
  read: '/admin/class-distribution',
  assign: '/admin/class-distribution/assign',
  workspace: '/admin/class-distribution/workspace',
  move: '/admin/class-distribution/move',
} as const;
