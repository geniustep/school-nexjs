import { describe, expect, it } from 'vitest';
import {
  decideParentChildAccess,
  isParentChildAccessDeniedError,
  parseParentChildId,
} from '@/lib/auth/parent-child-access';

describe('parent-child-access', () => {
  it('parses valid student ids only', () => {
    expect(parseParentChildId('857')).toBe(857);
    expect(parseParentChildId(1745)).toBe(1745);
    expect(parseParentChildId('0')).toBeNull();
    expect(parseParentChildId('-1')).toBeNull();
    expect(parseParentChildId('abc')).toBeNull();
    expect(parseParentChildId('')).toBeNull();
  });

  it('treats 403/404 style errors as access denied without revealing existence', () => {
    expect(isParentChildAccessDeniedError({ code: 'forbidden' })).toBe(true);
    expect(isParentChildAccessDeniedError({ code: 'permission_denied' })).toBe(true);
    expect(isParentChildAccessDeniedError({ code: 'not_found' })).toBe(true);
    expect(
      isParentChildAccessDeniedError({
        code: 'server_error',
        details: { status: 403 },
      }),
    ).toBe(true);
    expect(isParentChildAccessDeniedError({ code: 'server_error' })).toBe(false);
  });

  it('allows successful API envelopes', () => {
    expect(
      decideParentChildAccess({
        success: true,
        data: { id: 857 },
        meta: {},
      }),
    ).toEqual({ ok: true });
  });

  it('denies unauthorized child responses (1745 / unknown)', () => {
    expect(
      decideParentChildAccess({
        success: false,
        error: { code: 'forbidden', message: 'not linked' },
        meta: {},
      }),
    ).toEqual({ ok: false, reason: 'denied' });

    expect(
      decideParentChildAccess({
        success: false,
        error: { code: 'not_found', message: 'missing' },
        meta: {},
      }),
    ).toEqual({ ok: false, reason: 'denied' });
  });

  it('marks unexpected failures as unavailable (not a misleading empty state)', () => {
    expect(
      decideParentChildAccess({
        success: false,
        error: { code: 'server_error', message: 'boom' },
        meta: {},
      }),
    ).toEqual({ ok: false, reason: 'unavailable' });
    expect(decideParentChildAccess(null)).toEqual({ ok: false, reason: 'unavailable' });
  });
});
