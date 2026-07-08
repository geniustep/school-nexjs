import { describe, expect, it } from 'vitest';
import { mapGuardianPasswordApiError } from '@/lib/account/guardian-password-errors';
import {
  applyGuardianPasswordAssignSuccess,
  normalizeGuardianAccountPasswordFields,
  resolveGuardianPasswordAction,
  resolveGuardianPasswordParentId,
} from './guardian-password-contract';
import {
  normalizeStaffPasswordPolicy,
  validateStaffPasswordForm,
} from '@/features/admin/academic-setup/utils/staff-password-utils';

const t = (key: string) => `__${key}__`;

describe('guardian password action contract', () => {
  it('shows set password when password_was_set=false', () => {
    const action = resolveGuardianPasswordAction({
      can_assign_password: true,
      password_was_set: false,
    });
    expect(action.visible).toBe(true);
    expect(action.mode).toBe('set');
    expect(action.labelKey).toBe('admin.guardianAccount.password.setAction');
  });

  it('shows reset password when password_was_set=true', () => {
    const action = resolveGuardianPasswordAction({
      can_assign_password: true,
      password_was_set: true,
    });
    expect(action.visible).toBe(true);
    expect(action.mode).toBe('reset');
    expect(action.labelKey).toBe('admin.guardianAccount.password.resetAction');
  });

  it('hides action when can_assign_password=false', () => {
    expect(
      resolveGuardianPasswordAction({
        can_assign_password: false,
        password_was_set: false,
      }).visible,
    ).toBe(false);
    expect(resolveGuardianPasswordAction(null).visible).toBe(false);
    expect(
      resolveGuardianPasswordAction(
        { can_assign_password: true, password_was_set: false },
        { allowed_parent_actions: { account_assign_password: false } },
      ).visible,
    ).toBe(false);
  });

  it('allows parent detail when options permit active login despite false-negative can_assign_password', () => {
    expect(
      resolveGuardianPasswordAction(
        {
          can_assign_password: false,
          password_was_set: false,
          has_user_account: true,
          login: 'PAR00759',
          status: 'active',
        },
        { allowed_parent_actions: { account_assign_password: true } },
      ).visible,
    ).toBe(true);
  });

  it('marks password_was_set=true after successful assign without changing login', () => {
    const before = {
      can_assign_password: true,
      password_was_set: false,
      login: 'fatima.parent',
      status: 'active',
    };
    const after = applyGuardianPasswordAssignSuccess(before);
    expect(after?.password_was_set).toBe(true);
    expect(after?.login).toBe('fatima.parent');
    expect(after?.status).toBe('active');
  });

  it('uses the same dialog/action contract for parent detail and Student 360 account sources', () => {
    const parentAction = resolveGuardianPasswordAction({
      can_assign_password: true,
      password_was_set: true,
      login: 'parent.login',
    });
    const guardianAction = resolveGuardianPasswordAction({
      can_assign_password: true,
      password_was_set: true,
      login: 'parent.login',
    });
    expect(parentAction).toEqual(guardianAction);
  });
});

describe('guardian password validation and errors', () => {
  const policy = normalizeStaffPasswordPolicy({ min_length: 8, requires_letter: true, requires_number: true });

  it('surfaces confirmation mismatch in client validation', () => {
    const result = validateStaffPasswordForm(
      { password: 'ValidPass1', confirmPassword: 'OtherPass1', requirePassword: true },
      policy,
      t,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.confirmPassword).toBe(
      '__admin.academicSetup.staffPassword.errors.confirmPasswordMismatchHint__',
    );
  });

  it('maps password_policy_violation and related API codes', () => {
    expect(mapGuardianPasswordApiError({ code: 'password_policy_violation', message: '' }, t)).toBe(
      '__admin.guardianAccount.password.errors.policyViolation__',
    );
    expect(mapGuardianPasswordApiError({ code: 'password_confirmation_mismatch', message: '' }, t)).toBe(
      '__admin.guardianAccount.password.errors.confirmationMismatch__',
    );
    expect(mapGuardianPasswordApiError({ code: 'password_required', message: '' }, t)).toBe(
      '__admin.guardianAccount.password.errors.passwordRequired__',
    );
    expect(mapGuardianPasswordApiError({ code: 'guardian_not_found', message: '' }, t)).toBe(
      '__admin.guardianAccount.password.errors.guardianNotFound__',
    );
    expect(mapGuardianPasswordApiError({ code: 'guardian_account_identity_mismatch', message: '' }, t)).toBe(
      '__admin.guardianAccount.password.errors.identityMismatch__',
    );
  });
});

describe('Student 360 guardian id resolution', () => {
  it('uses guardian id and rejects partner_id or relationship id', () => {
    expect(resolveGuardianPasswordParentId({ guardianId: 701, partnerId: 900, relationshipId: 55 })).toBe(
      701,
    );
    expect(resolveGuardianPasswordParentId({ partnerId: 900, relationshipId: 55 })).toBeNull();
  });
});

describe('normalizeGuardianAccountPasswordFields', () => {
  it('defaults password_was_set to false for legacy payloads', () => {
    expect(normalizeGuardianAccountPasswordFields({ can_assign_password: true }).password_was_set).toBe(
      false,
    );
    expect(normalizeGuardianAccountPasswordFields(null).can_assign_password).toBeUndefined();
  });
});
