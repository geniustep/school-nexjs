import { describe, expect, it } from 'vitest';
import {
  CO_GUARDIAN_CONFIRMED_SIBLING_BADGE_KEY,
  CO_GUARDIAN_SAME_GUARDIAN_BADGE_KEY,
  candidateIsConfirmedSibling,
  resolveCoGuardianCandidateBadges,
} from './co-guardian-candidate-display';
import { translate } from '@/lib/i18n/messages';

describe('resolveCoGuardianCandidateBadges', () => {
  it('always exposes the "same guardian" badge', () => {
    const badges = resolveCoGuardianCandidateBadges({ is_confirmed_sibling: false });
    expect(badges.primaryKey).toBe(CO_GUARDIAN_SAME_GUARDIAN_BADGE_KEY);
  });

  it('does NOT add the sibling badge for unconfirmed candidates', () => {
    const badges = resolveCoGuardianCandidateBadges({ is_confirmed_sibling: false });
    expect(badges.siblingKey).toBeNull();
  });

  it('adds the sibling badge only when is_confirmed_sibling is true', () => {
    const badges = resolveCoGuardianCandidateBadges({ is_confirmed_sibling: true });
    expect(badges.siblingKey).toBe(CO_GUARDIAN_CONFIRMED_SIBLING_BADGE_KEY);
  });
});

describe('candidateIsConfirmedSibling', () => {
  it('is false for unconfirmed', () => {
    expect(candidateIsConfirmedSibling({ is_confirmed_sibling: false })).toBe(false);
  });
  it('is true only for confirmed', () => {
    expect(candidateIsConfirmedSibling({ is_confirmed_sibling: true })).toBe(true);
  });
});

describe('label wording rules (Arabic)', () => {
  it('the primary badge never calls unconfirmed candidates "إخوة"', () => {
    const badges = resolveCoGuardianCandidateBadges({ is_confirmed_sibling: false });
    const label = translate('ar', badges.primaryKey);
    expect(label).toBe('نفس الولي');
    expect(label).not.toContain('إخوة');
    expect(label).not.toContain('أخ');
  });

  it('the sibling badge wording ("مرتبط كأخ/أخت") is only reachable for confirmed candidates', () => {
    const confirmed = resolveCoGuardianCandidateBadges({ is_confirmed_sibling: true });
    expect(confirmed.siblingKey).not.toBeNull();
    expect(translate('ar', confirmed.siblingKey as string)).toBe('مرتبط كأخ/أخت');

    const unconfirmed = resolveCoGuardianCandidateBadges({ is_confirmed_sibling: false });
    expect(unconfirmed.siblingKey).toBeNull();
  });
});
