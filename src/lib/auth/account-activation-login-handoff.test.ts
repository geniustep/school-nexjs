// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearActivationLoginHandoff,
  consumeActivationLoginHandoff,
  readActivationLoginHandoff,
  storeActivationLoginHandoff,
} from './account-activation-login-handoff';

describe('account activation login handoff', () => {
  beforeEach(() => {
    clearActivationLoginHandoff();
    window.sessionStorage.clear();
  });

  it('stores a trimmed login for the same browser session only', () => {
    storeActivationLoginHandoff('  user@example.test  ');
    expect(readActivationLoginHandoff()).toBe('user@example.test');
  });

  it('keeps the consumed login stable after clearing session storage', () => {
    storeActivationLoginHandoff('user@example.test');
    expect(consumeActivationLoginHandoff()).toBe('user@example.test');
    expect(readActivationLoginHandoff()).toBe('');
    expect(consumeActivationLoginHandoff()).toBe('user@example.test');
  });

  it('forgets the consumed login after a successful sign-in cleanup', () => {
    storeActivationLoginHandoff('user@example.test');
    expect(consumeActivationLoginHandoff()).toBe('user@example.test');
    clearActivationLoginHandoff();
    expect(consumeActivationLoginHandoff()).toBe('');
  });
});
