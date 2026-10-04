import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relative: string) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

describe('password recovery UI source contract', () => {
  it('links login to the dedicated forgot-password page', () => {
    const login = read('src/features/auth/login-form.tsx');
    expect(login).toContain('href="/forgot-password"');
    expect(login).toContain("t('auth.forgotPassword')");
  });

  it('keeps recovery token in component state and out of URL/storage', () => {
    const source = read('src/features/auth/password-recovery-form.tsx');
    expect(source).toContain('setRecoveryToken');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('sessionStorage');
    expect(source).not.toContain('URLSearchParams');
    expect(source).not.toContain('router.push');
    expect(source).not.toContain('console.');
  });

  it('uses only the dedicated password-recovery namespace', () => {
    const source = read('src/features/auth/password-recovery-form.tsx');
    expect(source).toContain('/api/auth/password-recovery/');
    expect(source).not.toContain('/account-activation/');
    expect(source).not.toContain('/restore-credentials/');
  });

  it('contains anti-enumeration copy in every supported locale', () => {
    const expected: Record<string, string> = {
      ar: 'إذا كان هذا الرقم مرتبطًا بحساب صالح',
      fr: 'Si ce numéro correspond à un compte valide',
      en: 'If this number is linked to an eligible account',
      es: 'Si este número está vinculado a una cuenta válida',
    };
    for (const [locale, phrase] of Object.entries(expected)) {
      const messages = JSON.parse(read(`messages/${locale}.json`));
      expect(messages.auth.passwordRecovery.requestAccepted).toContain(phrase);
      expect(messages.auth.forgotPassword).toBeTruthy();
    }
  });
});
