import { describe, expect, it } from 'vitest';
import { guardianDuplicateSearchQuery } from './guardian-duplicate-search-query';

const input = {
  firstName: 'سارة',
  lastName: 'بونصاح',
  phone: '06 11 22 33 44',
  email: 'Staff.Parent@Test.Local',
  identityDocumentNumber: 'AB123',
};

const normalizePhone = (value: string) => value.replace(/\D/g, '');

describe('guardianDuplicateSearchQuery', () => {
  it('uses full name for staff/generic identity conflicts', () => {
    expect(guardianDuplicateSearchQuery('unknown', input, normalizePhone)).toBe(
      'سارة بونصاح',
    );
  });

  it('keeps field-specific searches for existing duplicate contracts', () => {
    expect(guardianDuplicateSearchQuery('phone', input, normalizePhone)).toBe(
      '0611223344',
    );
    expect(guardianDuplicateSearchQuery('email', input, normalizePhone)).toBe(
      'staff.parent@test.local',
    );
    expect(
      guardianDuplicateSearchQuery('national_id', input, normalizePhone),
    ).toBe('AB123');
  });
});
