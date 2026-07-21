import { describe, expect, it } from 'vitest';
import {
  ACTIVE_ROLE_HEADER,
  activeRoleCacheKey,
  activeRoleErrorBody,
  readActiveRoleHeader,
  resolveActiveRoleFromRequest,
  resolveActiveRoleFromRequestOrCookie,
  resolveActiveRoleTransport,
} from './active-role-transport';

describe('resolveActiveRoleTransport', () => {
  it('returns undefined when neither header nor query is present', () => {
    expect(resolveActiveRoleTransport({})).toEqual({ ok: true, role: undefined });
    expect(resolveActiveRoleTransport({ headerValue: null, queryValue: null })).toEqual({
      ok: true,
      role: undefined,
    });
  });

  it.each(['admin', 'teacher', 'parent', 'student'] as const)(
    'accepts legal header %s',
    (role) => {
      expect(resolveActiveRoleTransport({ headerValue: role })).toEqual({
        ok: true,
        role,
      });
    },
  );

  it('lowercases header values', () => {
    expect(resolveActiveRoleTransport({ headerValue: 'Teacher' })).toEqual({
      ok: true,
      role: 'teacher',
    });
    expect(resolveActiveRoleTransport({ headerValue: 'ADMIN' })).toEqual({
      ok: true,
      role: 'admin',
    });
  });

  it('trims whitespace', () => {
    expect(resolveActiveRoleTransport({ headerValue: '  teacher  ' })).toEqual({
      ok: true,
      role: 'teacher',
    });
  });

  it('rejects unknown roles with invalid_active_role', () => {
    const result = resolveActiveRoleTransport({ headerValue: 'superuser' });
    expect(result).toEqual({
      ok: false,
      code: 'invalid_active_role',
      message: 'Invalid active role.',
    });
  });

  it('treats empty/whitespace as absent (no role granted)', () => {
    expect(resolveActiveRoleTransport({ headerValue: '' })).toEqual({
      ok: true,
      role: undefined,
    });
    expect(resolveActiveRoleTransport({ headerValue: '   ' })).toEqual({
      ok: true,
      role: undefined,
    });
    expect(resolveActiveRoleTransport({ queryValue: '' })).toEqual({
      ok: true,
      role: undefined,
    });
  });

  it('accepts matching header and query', () => {
    expect(
      resolveActiveRoleTransport({ headerValue: 'teacher', queryValue: 'teacher' }),
    ).toEqual({ ok: true, role: 'teacher' });
    expect(
      resolveActiveRoleTransport({ headerValue: 'Teacher', queryValue: 'TEACHER' }),
    ).toEqual({ ok: true, role: 'teacher' });
  });

  it('rejects conflicting header and query', () => {
    expect(
      resolveActiveRoleTransport({ headerValue: 'teacher', queryValue: 'admin' }),
    ).toEqual({
      ok: false,
      code: 'active_role_conflict',
      message: 'Conflicting active role values.',
    });
  });

  it('accepts query-only legal role', () => {
    expect(resolveActiveRoleTransport({ queryValue: 'parent' })).toEqual({
      ok: true,
      role: 'parent',
    });
  });
});

describe('readActiveRoleHeader', () => {
  it('reads header case-insensitively', () => {
    const headers = new Headers({ 'x-ssc-active-role': 'teacher' });
    expect(readActiveRoleHeader(headers)).toBe('teacher');

    const mixed = new Headers();
    mixed.set('X-SSC-Active-Role', 'admin');
    expect(readActiveRoleHeader(mixed)).toBe('admin');
  });

  it('does not invent roles from unrelated headers', () => {
    const headers = new Headers({
      Authorization: 'Bearer x',
      'X-Forwarded-For': '1.2.3.4',
      Cookie: 'session_id=abc',
      'X-SSC-Something-Else': 'teacher',
    });
    expect(readActiveRoleHeader(headers)).toBeNull();
  });
});

describe('resolveActiveRoleFromRequest', () => {
  it('resolves from Request url query and headers', () => {
    const req = new Request('https://app.example/api/auth/me?active_role=teacher', {
      headers: { [ACTIVE_ROLE_HEADER]: 'teacher' },
    });
    expect(resolveActiveRoleFromRequest(req)).toEqual({ ok: true, role: 'teacher' });
  });

  it('detects conflict between header and query on Request', () => {
    const req = new Request('https://app.example/api/auth/me?active_role=admin', {
      headers: { [ACTIVE_ROLE_HEADER]: 'teacher' },
    });
    expect(resolveActiveRoleFromRequest(req).ok).toBe(false);
  });
});

describe('resolveActiveRoleFromRequestOrCookie', () => {
  it('prefers request header over cookie', () => {
    const req = new Request('https://app.example/api/auth/me', {
      headers: { 'X-SSC-Active-Role': 'teacher' },
    });
    expect(resolveActiveRoleFromRequestOrCookie(req, 'admin')).toEqual({
      ok: true,
      role: 'teacher',
    });
  });

  it('falls back to cookie when request has no role', () => {
    const req = new Request('https://app.example/api/auth/me');
    expect(resolveActiveRoleFromRequestOrCookie(req, 'parent')).toEqual({
      ok: true,
      role: 'parent',
    });
  });
});

describe('activeRoleErrorBody / cache key', () => {
  it('builds stable error envelope without stack details', () => {
    expect(activeRoleErrorBody('invalid_active_role', 'Invalid active role.')).toEqual({
      success: false,
      error: { code: 'invalid_active_role', message: 'Invalid active role.', details: {} },
      meta: {},
    });
    expect(activeRoleErrorBody('active_role_conflict', 'Conflicting active role values.')).toEqual(
      {
        success: false,
        error: {
          code: 'active_role_conflict',
          message: 'Conflicting active role values.',
          details: {},
        },
        meta: {},
      },
    );
  });

  it('separates cache key segments for admin / teacher / undefined', () => {
    expect(activeRoleCacheKey('admin')).toBe('admin');
    expect(activeRoleCacheKey('teacher')).toBe('teacher');
    expect(activeRoleCacheKey(undefined)).toBe('');
    expect(activeRoleCacheKey('admin')).not.toBe(activeRoleCacheKey('teacher'));
    expect(activeRoleCacheKey(undefined)).not.toBe(activeRoleCacheKey('admin'));
  });
});
