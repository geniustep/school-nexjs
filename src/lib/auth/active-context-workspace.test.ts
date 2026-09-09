import { describe, expect, it } from 'vitest';
import {
  contextIsAvailable,
  contextKey,
  hasContextContract,
  listAvailableContexts,
  shouldShowContextSwitcher,
} from '@/lib/auth/active-context-workspace';

const contexts = [
  { school_id: 1, school_name: 'School A', role: 'admin' as const, source: 'admin_membership' },
  { school_id: 2, school_name: 'School B', role: 'parent' as const, source: 'guardian' },
];

describe('active context workspace', () => {
  it('uses the server supplied context list as-is', () => {
    expect(listAvailableContexts({ available_contexts: contexts })).toEqual(contexts);
  });

  it('does not invent context contract for a legacy payload', () => {
    expect(hasContextContract({})).toBe(false);
    expect(listAvailableContexts({})).toEqual([]);
  });

  it('shows context switcher only when more than one authorized tuple exists', () => {
    expect(shouldShowContextSwitcher({ available_contexts: contexts })).toBe(true);
    expect(shouldShowContextSwitcher({ available_contexts: [contexts[0]] })).toBe(false);
  });

  it('treats school and role as one atomic key', () => {
    expect(contextKey(contexts[1])).toBe('2:parent');
    expect(contextIsAvailable({ available_contexts: contexts }, { school_id: 2, role: 'admin' })).toBe(false);
  });
});
