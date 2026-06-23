import { describe, expect, it } from 'vitest';
import {
  isOdooAdminRoleTeacherEndpointBlock,
  isTeacherWorkspaceLoadError,
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
