import { describe, expect, it } from 'vitest';
import { canLinkPersonAsGuardian } from './guardian-profile-contract';
import {
  canLinkGuardianCandidate,
  formatGuardianCandidateWarnings,
  resolveGuardianLinkBlockerMessage,
  translateGuardianCandidateWarning,
} from './guardian-candidate-presentation';

const t = (key: string, params?: Record<string, string | number>) => {
  if (params) {
    return `${key}:${JSON.stringify(params)}`;
  }
  return key;
};

describe('guardian-candidate-presentation', () => {
  it('translates known warning codes instead of raw API messages', () => {
    expect(
      translateGuardianCandidateWarning(t, {
        code: 'guardian_of_other_students',
        message: 'This person is already guardian of %(count)s student(s).',
        count: 2,
      }),
    ).toBe(
      'admin.student360.guardianCandidateWarnings.guardianOfOtherStudents:{"count":2}',
    );
    expect(
      translateGuardianCandidateWarning(t, {
        code: 'already_linked_to_student',
        message: 'This person is already linked to this student.',
      }),
    ).toBe('admin.student360.guardianCandidateWarnings.alreadyLinkedToStudent');
    expect(
      translateGuardianCandidateWarning(t, {
        code: 'existing_teacher_role',
        message: 'This person already has a teacher profile.',
      }),
    ).toBe('admin.student360.guardianCandidateWarnings.existingTeacherRole');
  });

  it('drops untranslated Odoo template messages', () => {
    expect(
      translateGuardianCandidateWarning(t, {
        code: 'unknown_code',
        message: 'This person is already guardian of %(count)s student(s).',
      }),
    ).toBeNull();
  });

  it('formats translated warning messages from API payload', () => {
    expect(
      formatGuardianCandidateWarnings(t, [
        { code: 'existing_teacher_role', message: 'Teacher profile exists.' },
        { code: 'has_user_account', message: 'Login account exists.' },
      ]),
    ).toEqual([
      'admin.student360.guardianCandidateWarnings.existingTeacherRole',
      'admin.student360.guardianCandidateWarnings.hasUserAccount',
    ]);
  });

  it('can skip duplicate already-linked warnings when badge is shown', () => {
    expect(
      formatGuardianCandidateWarnings(
        t,
        [{ code: 'already_linked_to_student', message: 'Already linked.' }],
        { skipCodes: ['already_linked_to_student'] },
      ),
    ).toEqual([]);
  });

  it('prefers translated warning over generic blocker text', () => {
    expect(
      resolveGuardianLinkBlockerMessage(t, {
        can_link_as_guardian: false,
        warnings: [{ code: 'already_linked_to_student', message: 'Already linked elsewhere.' }],
      }),
    ).toBe('admin.student360.guardianCandidateWarnings.alreadyLinkedToStudent');
  });

  it('falls back to translated blocker text when warnings are empty', () => {
    expect(
      resolveGuardianLinkBlockerMessage(t, {
        can_link_as_guardian: false,
        warnings: [],
      }),
    ).toBe('admin.student360.guardianCandidateCannotLink');
  });

  it('blocks candidate with can_link_as_guardian=false even when allowed_actions.link_as_guardian=true', () => {
    const candidate = {
      can_link_as_guardian: false as const,
      allowed_actions: { link_as_guardian: true },
    };
    expect(canLinkGuardianCandidate(candidate)).toBe(false);
    expect(canLinkPersonAsGuardian(candidate, false)).toBe(false);
  });

  it('allows candidate when can_link_as_guardian=true and allowed_actions.link_as_guardian=true', () => {
    const candidate = {
      can_link_as_guardian: true as const,
      allowed_actions: { link_as_guardian: true },
    };
    expect(canLinkGuardianCandidate(candidate)).toBe(true);
    expect(canLinkPersonAsGuardian(candidate, false)).toBe(true);
  });
});
