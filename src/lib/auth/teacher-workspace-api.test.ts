import { describe, expect, it } from 'vitest';
import {
  isOdooAdminRoleTeacherEndpointBlock,
  isTeacherWorkspaceLoadError,
  shouldRenderTeacherLinkingState,
} from '@/lib/auth/teacher-workspace-api';
import type { ApiErrorBody } from '@/types/api';

describe('isOdooAdminRoleTeacherEndpointBlock', () => {
  it('detects Odoo admin-on-teacher-endpoint message', () => {
    expect(
      isOdooAdminRoleTeacherEndpointBlock(
        'Admin accounts must use /api/v1/admin/* endpoints for this resource.',
      ),
    ).toBe(true);
  });

  it('returns false for unrelated messages', () => {
    expect(isOdooAdminRoleTeacherEndpointBlock('Missing permission to view admin staff.')).toBe(
      false,
    );
  });
});

describe('shouldRenderTeacherLinkingState', () => {
  const teacherError = {
    code: 'teacher_workspace_unavailable',
    message: 'blocked',
  };

  it('returns true on /teacher routes for normalized errors', () => {
    expect(
      shouldRenderTeacherLinkingState(teacherError, { pathname: '/teacher/classes' }),
    ).toBe(true);
  });

  it('returns false outside teacher workspace', () => {
    expect(
      shouldRenderTeacherLinkingState(teacherError, { pathname: '/admin/staff' }),
    ).toBe(false);
  });

  it('returns false for manager forbidden outside teacher workspace', () => {
    const error = {
      code: 'forbidden',
      message: 'Missing permission',
      details: { status: 403 },
    };
    expect(shouldRenderTeacherLinkingState(error, { pathname: '/admin/dashboard' })).toBe(
      false,
    );
  });

  it('returns true when teacherWorkspace is forced on', () => {
    expect(shouldRenderTeacherLinkingState(teacherError, { teacherWorkspace: true })).toBe(true);
  });

  it('returns false when teacherWorkspace is forced off', () => {
    expect(
      shouldRenderTeacherLinkingState(teacherError, {
        teacherWorkspace: false,
        pathname: '/teacher/dashboard',
      }),
    ).toBe(false);
  });
});

describe('isTeacherWorkspaceLoadError', () => {
  it('accepts normalized BFF code', () => {
    const error: ApiErrorBody = { code: 'teacher_workspace_unavailable', message: 'blocked' };
    expect(isTeacherWorkspaceLoadError(error)).toBe(true);
  });

  it('accepts Odoo forbidden on teacher endpoints for Smart Staff admin sessions', () => {
    const error: ApiErrorBody = {
      code: 'forbidden',
      message: 'Admin accounts must use /api/v1/admin/* endpoints for this resource.',
      details: { status: 403 },
    };
    expect(isTeacherWorkspaceLoadError(error)).toBe(true);
  });

  it('rejects unrelated server errors', () => {
    const error: ApiErrorBody = { code: 'server_error', message: 'Unexpected failure.' };
    expect(isTeacherWorkspaceLoadError(error)).toBe(false);
  });
});
