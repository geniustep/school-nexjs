import { describe, expect, it } from 'vitest';
import {
  parentAccountPresentationSource,
  resolveParentAccountPresentation,
} from './resolve-parent-account-presentation';

describe('resolveParentAccountPresentation', () => {
  it('maps parent account contract to guardian presentation', () => {
    const presentation = resolveParentAccountPresentation({
      code: 'G-2001',
      login: 'legacy.login',
      has_user_account: true,
      account: {
        login: 'fatima.parent',
        status: 'active',
        has_user_account: true,
      },
    });

    expect(presentation.code).toBe('G-2001');
    expect(presentation.login).toBe('fatima.parent');
    expect(presentation.status).toBe('active');
    expect(presentation.statusLabelKey).toBe('admin.guardianAccount.status.active');
  });

  it('maps inactive and no_account statuses for parent detail', () => {
    expect(
      resolveParentAccountPresentation({
        code: 'G-2',
        account: { status: 'inactive', has_user_account: true },
      }).statusLabelKey,
    ).toBe('admin.guardianAccount.status.inactive');

    expect(
      resolveParentAccountPresentation({
        code: 'G-3',
        has_user_account: false,
        account: { status: 'no_account', has_user_account: false },
      }).statusLabelKey,
    ).toBe('admin.guardianAccount.status.noAccount');
  });

  it('falls back to root login when account.login is absent', () => {
    const source = parentAccountPresentationSource({
      code: 'G-4',
      login: 'root.login',
      has_user_account: true,
      account: { status: 'active', has_user_account: true },
    });

    expect(resolveParentAccountPresentation(source).login).toBe('root.login');
  });

  it('handles missing code and login without crashing', () => {
    const presentation = resolveParentAccountPresentation({
      has_user_account: false,
      account: { status: 'no_account', has_user_account: false },
    });

    expect(presentation.code).toBeNull();
    expect(presentation.login).toBeNull();
    expect(presentation.hasVisibleAccountInfo).toBe(true);
  });

  it('uses safe fallback for unknown account status', () => {
    const presentation = resolveParentAccountPresentation({
      code: 'G-9',
      account: { status: 'pending_review', has_user_account: true },
    });

    expect(presentation.status).toBe('unknown');
    expect(presentation.statusLabelKey).toBe('admin.guardianAccount.status.unknown');
  });
});

describe('parent list copy availability', () => {
  it('exposes code for copy when present and omits login from list source', () => {
    const presentation = resolveParentAccountPresentation({
      code: 'G-LIST-1',
      account: { login: 'hidden.in.detail', status: 'active', has_user_account: true },
    });

    expect(presentation.code).toBe('G-LIST-1');
    expect(presentation.login).toBe('hidden.in.detail');
  });

  it('hides presentation when no account identity fields exist', () => {
    expect(
      resolveParentAccountPresentation({
        has_user_account: undefined,
        account: null,
      }).hasVisibleAccountInfo,
    ).toBe(false);
  });
});
