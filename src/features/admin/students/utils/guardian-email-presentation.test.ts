import { describe, expect, it } from 'vitest';
import {
  getGuardianEmailPresentation,
  hasCompleteGuardianContact,
  isUsableGuardianEmail,
} from './guardian-email-presentation';

describe('isUsableGuardianEmail', () => {
  it('rejects technical placeholder emails', () => {
    expect(isUsableGuardianEmail('guardian+1781516109169@example.invalid')).toBe(false);
    expect(isUsableGuardianEmail('x@example.com')).toBe(false);
  });

  it('accepts normal emails', () => {
    expect(isUsableGuardianEmail('zaka@gmail.com')).toBe(true);
  });
});

describe('getGuardianEmailPresentation', () => {
  it('marks technical emails as hidden', () => {
    expect(getGuardianEmailPresentation('guardian+1@example.invalid').kind).toBe('hidden_technical');
  });
});

describe('hasCompleteGuardianContact', () => {
  it('detects incomplete contact', () => {
    expect(hasCompleteGuardianContact(null, null, 'guardian+1@example.invalid')).toBe(false);
    expect(hasCompleteGuardianContact('0620976497', null, null)).toBe(true);
  });
});
