import { describe, expect, it } from 'vitest';
import {
  normalizeGuardianList,
  normalizeGuardianQuickCreateResponse,
  normalizeGuardianSummary,
} from './normalize-guardian';

describe('normalizeGuardianSummary', () => {
  it('maps flat API guardian with mobile and full_name', () => {
    const g = normalizeGuardianSummary({
      id: 216,
      full_name: 'QA Parent',
      name: 'QA Parent',
      mobile: '0612345678',
      email: 'qa@example.test',
      linked_students_count: 2,
    });
    expect(g).toEqual({
      id: 216,
      code: null,
      guardian_id: 216,
      partner_id: undefined,
      person_id: undefined,
      teacher_id: null,
      staff_id: null,
      user_id: null,
      guardian_links_count: undefined,
      linked_students_count: 2,
      name: 'QA Parent',
      phone: '0612345678',
      secondary_phone: null,
      email: 'qa@example.test',
      address: null,
      national_id: null,
      identity_document_type: null,
      identity_document_number: null,
      identity_document_country: null,
      national_id_masked: null,
      identity_document_number_masked: null,
      children_count: 2,
      existing_roles: undefined,
      role_labels: undefined,
      has_user: false,
      has_user_account: false,
      has_account: false,
      account: null,
    });
  });

  it('returns null without id', () => {
    expect(normalizeGuardianSummary({ name: 'x' })).toBeNull();
  });
});

describe('normalizeGuardianQuickCreateResponse', () => {
  it('accepts nested guardian wrapper', () => {
    const g = normalizeGuardianQuickCreateResponse({
      guardian: { id: 1, name: 'A', phone: '06' },
    });
    expect(g?.id).toBe(1);
  });

  it('accepts flat quick-create payload from live API', () => {
    const g = normalizeGuardianQuickCreateResponse({
      id: 217,
      full_name: 'Student360 QA Guardian',
      name: 'Student360 QA Guardian',
      mobile: '0692234470',
      phone: '0692234470',
      email: 'ssc360qa@example.invalid',
      has_account: false,
      linked_students_count: 0,
    });
    expect(g?.id).toBe(217);
    expect(g?.name).toBe('Student360 QA Guardian');
    expect(g?.phone).toBe('0692234470');
  });
});

describe('normalizeGuardianList', () => {
  it('unwraps items array from list endpoint', () => {
    const list = normalizeGuardianList({
      items: [{ id: 3, name: 'Parent', phone: '06' }],
    });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(3);
  });
});
