import { describe, expect, it } from 'vitest';
import {
  hasDuplicateDisplayNames,
  needsNewAccountFromLink,
  personHasTeacherRole,
  personProfileDescription,
} from './person-role-presentation';

const t = (key: string) => key;

describe('person-role-presentation', () => {
  it('detects duplicate display names', () => {
    expect(
      hasDuplicateDisplayNames([
        {
          partner_id: 1,
          id: 1,
          name: 'محسنة الوهابي',
          existing_roles: ['teacher'],
          role_labels: ['أستاذة'],
          has_user_account: true,
          can_link_as_guardian: true,
        },
        {
          partner_id: 2,
          id: 2,
          name: 'محسنة الوهابي',
          existing_roles: ['guardian'],
          role_labels: ['ولي أمر'],
          has_user_account: false,
          can_link_as_guardian: true,
        },
      ]),
    ).toBe(true);
  });

  it('uses teacher profile description for teacher role', () => {
    expect(
      personProfileDescription(t, {
        existing_roles: ['teacher'],
        role_labels: ['أستاذة'],
      }),
    ).toBe('admin.student360.personRegisteredAsTeacher');
    expect(personHasTeacherRole({ existing_roles: ['teacher'] })).toBe(true);
  });

  it('respects needs_new_account from link response', () => {
    expect(needsNewAccountFromLink({ needs_new_account: false }, false)).toBe(false);
    expect(needsNewAccountFromLink({ needs_new_account: true }, true)).toBe(true);
    expect(needsNewAccountFromLink(undefined, true)).toBe(false);
    expect(needsNewAccountFromLink(undefined, false)).toBe(true);
  });
});
