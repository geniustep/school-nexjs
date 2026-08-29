/**
 * Isolated endpoint slice for the staged class-distribution contract.
 * Feature code never carries raw School API paths; this can be folded into the
 * large central endpoint registry when the Odoo contract is promoted.
 */
export const classDistributionEndpoints = {
  read: '/admin/class-distribution',
  assign: '/admin/class-distribution/assign',
} as const;
