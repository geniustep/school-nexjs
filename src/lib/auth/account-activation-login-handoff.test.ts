// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearActivationLoginHandoff,
  readActivationLoginHandoff,
  storeActivationLoginHandoff,
} from './account-activation-login-handoff';

describe('account activation login handoff', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('stores a trimmed login for the same browser session only', () => {
    storeActivationLoginHandoff('  user@example.test  ');
    expect(readActivationLoginHandoff()).toBe('user@example.test');
  });

  it('clears the handoff after the login form consumes it', () => {
    storeActivationLoginHandoff('user@example.test');
    clearActivationLoginHandoff();
    expect(readActivationLoginHandoff()).toBe('');
  });
});
