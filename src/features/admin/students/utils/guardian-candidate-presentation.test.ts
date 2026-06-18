import { describe, expect, it } from 'vitest';
import { canLinkPersonAsGuardian } from './guardian-profile-contract';
import {
  canLinkGuardianCandidate,
  formatGuardianCandidateWarnings,
  resolveGuardianLinkBlockerMessage,
} from './guardian-candidate-presentation';

const t = (key: string) => key;

describe('guardian-candidate-presentation', () => {
  it('formats warning messages from API payload', () => {
    expect(
      formatGuardianCandidateWarnings([
        { code: 'existing_teacher_role', message: 'Teacher profile exists.' },
        { code: 'has_user_account', message: 'Login account exists.' },
      ]),
    ).toEqual(['Teacher profile exists.', 'Login account exists.']);
  });

  it('prefers warning message over generic blocker text', () => {
    expect(
      resolveGuardianLinkBlockerMessage(t, {
        can_link_as_guardian: false,
        warnings: [{ code: 'blocked', message: 'Already linked elsewhere.' }],
      }),
    ).toBe('Already linked elsewhere.');
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
