import { describe, expect, it } from 'vitest';
import { buildAdmissionOutcomeFilterQuery } from './admission-status-display';

/**
 * Dashboard outcome cards must deep-link via server-side query builders,
 * never via legacy accepted_count client math.
 */
describe('admissions outcome dashboard contracts', () => {
  it('awaiting card uses registration_status query not accepted_count', () => {
    const query = buildAdmissionOutcomeFilterQuery('awaiting_registration');
    expect(query).toEqual({ registration_status: 'awaiting_registration' });
    expect(query).not.toHaveProperty('accepted_count');
    expect(Object.keys(query)).not.toContain('state');
  });

  it('ready card uses state=confirmed not registration_status=registered', () => {
    const query = buildAdmissionOutcomeFilterQuery('ready_for_registration');
    expect(query).toEqual({ state: 'confirmed' });
    expect(query).not.toHaveProperty('registration_status');
  });

  it('registered filter does not mutate writable state', () => {
    const query = buildAdmissionOutcomeFilterQuery('registered');
    expect(query).toEqual({ registration_status: 'registered' });
    expect(query).not.toHaveProperty('state');
  });
});
