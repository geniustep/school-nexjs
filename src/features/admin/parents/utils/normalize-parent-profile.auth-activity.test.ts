import { describe, expect, it } from 'vitest';
import { normalizeParentListItems } from './normalize-parent-profile';

describe('parent list authentication activity', () => {
  it('preserves Odoo activity when normalizing the family list', () => {
    const activity = {
      activity_state: 'never_authenticated',
      last_authenticated_at: null,
      activity_confidence: null,
    };
    const [parent] = normalizeParentListItems([{
      id: 77,
      name: 'Parent',
      phone: null,
      email: null,
      relation: 'father',
      status: 'active',
      authentication_activity: activity,
    }]);
    expect(parent?.authentication_activity).toEqual(activity);
  });

  it('keeps missing activity unknown instead of treating it as no account', () => {
    const [parent] = normalizeParentListItems([{
      id: 78,
      name: 'Other parent',
      phone: null,
      email: null,
      relation: 'mother',
      status: 'active',
    }]);
    expect(parent?.authentication_activity).toBeUndefined();
  });
});
