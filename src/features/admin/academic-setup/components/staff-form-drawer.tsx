'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccountFieldsSection } from '@/features/admin/account/account-fields-section';
import { AccountStatusBadge } from '@/features/admin/account/account-status-badge';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import {
  applyAccountMutationToasts,
  resolveAccountMutationFeedback,
} from '@/lib/account/account-mutation-feedback';
import { mapAccountApiError } from '@/lib/account/account-errors';
import {
  buildAccountIdentityPayload,
  validateCreateAccountInput,
} from '@/lib/account/account-utils';
import type { StaffAdminKind, StaffEffectivePermissionsPayload, StaffMember, StaffOptions } from '@/types/academic-setup';
import {
  buildStaffPermissionSavePayload,
  canSaveStaffPermissionChanges,
  capabilityCodesToIds,
  capabilityIdsToCodes,
  memberHasPermissionScopes,
  resolvePermissionEditorMember,
  resolveStoredCapabilityCodes,
  responseIncludesCapabilityCodes,
} from '@/features/admin/staff/utils/staff-permission-merge';
import { useStaffCenterDetailWithPermissions } from '@/features/admin/staff/hooks/use-staff-center';
import { normalizeStaffCenterMember } from '@/features/admin/staff/utils/normalize-staff-center';
import {
  resolveRoleChangeWarningKey,
  resolveStaffPermissionMetadata,
} from '../utils/staff-permissions-meta';
import {
  canCreateStaffAccountWithPassword,
  canResetStaffAccountPassword,
  clearStaffPasswordState,
  normalizeStaffPasswordPolicy,
  resolveStaffAccountLogin,
  validateStaffPasswordForm,
  type StaffPasswordFieldErrors,
} from '../utils/staff-password-utils';
import {
  createStaffMember,
  deactivateStaffMember,
  updateStaffMember,
  useStaffMember,
} from '../hooks/use-staff';
import { mapAcademicSetupApiError } from '../utils/api-errors';
import { staffMutationSuccessKey } from '../utils/staff-utils';
import {
  staffShowsDeactivate,
  staffShowsReactivate,
} from './staff-reactivate-dialog';
import { StaffCapabilitiesSection } from './staff-capabilities-section';
import { StaffPasswordSection } from './staff-password-section';
import { StaffResetPasswordDialog } from './staff-reset-password-dialog';
import { SetupDrawer } from './setup-drawer';

const STAFF_FORM_ID = 'academic-staff-form';

function resolveStaffLogin(member: StaffMember): string {
  return member.login?.trim() || member.account?.login?.trim() || member.email?.trim() || '';
}

export function StaffFormDrawer({
  open,
  memberId,
  member: memberFromList,
  permissionsPayload: permissionsPayloadProp,
  options,
  optionsLoading = false,
  optionsError = null,
  onRetryOptions,
  canManage,
  onClose,
  onSaved,
  onReactivate,
}: {
  open: boolean;
  memberId: number | null;
  member?: StaffMember;
  permissionsPayload?: StaffEffectivePermissionsPayload | null;
  options?: StaffOptions;
  optionsLoading?: boolean;
  optionsError?: string | null;
  onRetryOptions?: () => void;
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void;
  onReactivate?: (member: StaffMember) => void;
}) {
  const t = useT();
  const toast = useToast();
  const creating = memberId == null;
  const shouldHydrateCenterDetail = open && !creating && memberId != null;
  const centerDetail = useStaffCenterDetailWithPermissions(
    shouldHydrateCenterDetail ? memberId : null,
  );
  const legacyMemberState = useStaffMember(
    open && !creating && memberId && !memberFromList ? memberId : null,
  );
  const member = useMemo(
    () =>
      resolvePermissionEditorMember({
        seed: memberFromList ?? legacyMemberState.data,
        hydrated: centerDetail.member,
      }),
    [memberFromList, legacyMemberState.data, centerDetail.member],
  );
  const permissionsPayload = centerDetail.permissionsPayload ?? permissionsPayloadProp ?? null;
  const permissionScopesLoading =
    shouldHydrateCenterDetail && centerDetail.loading && !memberHasPermissionScopes(member);
  const drawerInitialLoading =
    !creating && memberId != null && !member && (centerDetail.loading || legacyMemberState.loading);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [login, setLogin] = useState('');
  const [useDifferentLogin, setUseDifferentLogin] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalLogin, setOriginalLogin] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [adminKind, setAdminKind] = useState<StaffAdminKind | ''>('');
  const [originalAdminKind, setOriginalAdminKind] = useState<StaffAdminKind | ''>('');
  const [capabilityIds, setCapabilityIds] = useState<number[]>([]);
  const [originalCapabilityIds, setOriginalCapabilityIds] = useState<number[]>([]);
  const [capabilitiesTouched, setCapabilitiesTouched] = useState(false);
  const [assignPasswordNow, setAssignPasswordNow] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<StaffPasswordFieldErrors>({});
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const passwordPolicy = useMemo(
    () => normalizeStaffPasswordPolicy(options?.password_policy),
    [options?.password_policy],
  );
  const showCreatePassword = creating && canCreateStaffAccountWithPassword(options);
  const showResetPassword = !creating && canResetStaffAccountPassword(options);

  const clearPasswordFields = useCallback(() => {
    clearStaffPasswordState({ setPassword, setConfirmPassword, setShowPassword });
    setPasswordErrors({});
  }, []);

  useEffect(() => {
    if (!open) {
      clearPasswordFields();
      setResetDialogOpen(false);
    }
  }, [open, clearPasswordFields]);

  useEffect(() => {
    if (creating) {
      setName('');
      setEmail('');
      setLogin('');
      setUseDifferentLogin(false);
      setOriginalEmail('');
      setOriginalLogin('');
      setPhone('');
      setJobTitle('');
      setAdminKind(options?.admin_kinds[0]?.value ?? 'admin_staff');
      setOriginalAdminKind('');
      setCapabilityIds([]);
      setOriginalCapabilityIds([]);
      setCapabilitiesTouched(false);
      setAssignPasswordNow(true);
      clearPasswordFields();
      return;
    }
    if (!member) return;
    const memberEmail = member.email ?? '';
    const memberLogin = resolveStaffLogin(member);
    setName(member.name);
    setEmail(memberEmail);
    setLogin(memberLogin);
    setOriginalEmail(memberEmail);
    setOriginalLogin(memberLogin);
    setUseDifferentLogin(Boolean(memberLogin && memberEmail && memberLogin !== memberEmail));
    setPhone(member.phone ?? '');
    setJobTitle(member.job_title ?? '');
    setAdminKind(
      member.admin_kind && typeof member.admin_kind === 'string'
        ? (member.admin_kind as StaffAdminKind)
        : '',
    );
    setOriginalAdminKind(
      member.admin_kind && typeof member.admin_kind === 'string'
        ? (member.admin_kind as StaffAdminKind)
        : '',
    );
    const storedCodes = resolveStoredCapabilityCodes(member, permissionsPayload);
    const resolvedIds = capabilityCodesToIds(storedCodes, options?.capabilities ?? []);
    setCapabilityIds(resolvedIds);
    setOriginalCapabilityIds(resolvedIds);
    setCapabilitiesTouched(false);
    clearPasswordFields();
  }, [member, creating, options, memberId, clearPasswordFields, permissionsPayload]);

  const catalogReady = Boolean(options?.capabilities?.length);
  const hasTeacherProfile = Boolean(member?.teacher_id || member?.teacher?.id);
  const teacherOnlySelected = !creating && hasTeacherProfile && adminKind === '';
  const adminKindChanged = !creating && originalAdminKind !== '' && adminKind !== originalAdminKind;

  const permissionsContext = useMemo(
    () =>
      resolveStaffPermissionMetadata({
        adminKind: (adminKind || 'admin_staff') as StaffAdminKind,
        member: creating ? null : member,
        options,
        preferMemberMetadata:
          !creating && !adminKindChanged && member?.admin_kind === adminKind,
      }),
    [adminKind, member, options, creating, adminKindChanged],
  );

  const roleChangeWarningKey =
    adminKindChanged && originalAdminKind && !teacherOnlySelected
      ? resolveRoleChangeWarningKey(
          originalAdminKind as StaffAdminKind,
          (adminKind || 'admin_staff') as StaffAdminKind,
          options,
        )
      : null;

  const accountEntity = useMemo(() => member ?? undefined, [member]);

  function handleClose() {
    clearPasswordFields();
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;

    if (creating && !validateCreateAccountInput(email, login, useDifferentLogin)) {
      toast.error(t('admin.account.errors.loginRequired'));
      return;
    }

    if (showCreatePassword && assignPasswordNow) {
      const validation = validateStaffPasswordForm(
        { password, confirmPassword, requirePassword: true },
        passwordPolicy,
        t,
      );
      setPasswordErrors(validation.errors);
      if (!validation.valid) return;
    } else {
      setPasswordErrors({});
    }

    const identity = buildAccountIdentityPayload({
      email,
      login,
      originalEmail,
      originalLogin,
      useDifferentLogin,
      isCreate: creating,
    });

    const capPayload = buildStaffPermissionSavePayload({
      isCreate: creating,
      member: creating ? null : member,
      capabilityIds,
      originalCapabilityIds,
      capabilitiesTouched,
      catalog: options?.capabilities ?? [],
      catalogReady,
      permissionsMeta: permissionsContext,
    });

    if (capPayload.blockSaveDueToCatalog) {
      toast.error(t('admin.academicSetup.staffCapabilities.catalogUnavailableWarning'));
      return;
    }

    const saveGuard = canSaveStaffPermissionChanges({
      member: creating ? null : member,
      scopesLoading: permissionScopesLoading,
      capabilityChangesAttempted: capPayload.capabilityChangesAttempted,
    });
    if (!saveGuard.allowed && saveGuard.reason === 'loading') {
      return;
    }
    if (!saveGuard.allowed && saveGuard.reason === 'missing_scope') {
      toast.error(t('admin.staffCenter.errors.scopesRequiredForCapabilityUpdate'));
      return;
    }

    if (capPayload.blockSaveMissingScope) {
      toast.error(t('admin.staffCenter.errors.scopesRequiredForCapabilityUpdate'));
      return;
    }

    if (
      capPayload.capabilityChangesAttempted &&
      !creating &&
      !capPayload.mergePayload?.scopes?.length
    ) {
      toast.error(t('admin.staffCenter.errors.scopesRequiredForCapabilityUpdate'));
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      ...identity,
      phone: phone.trim() || undefined,
      job_title: jobTitle.trim() || undefined,
    };

    if (creating || adminKind !== originalAdminKind) {
      payload.admin_kind = teacherOnlySelected ? null : adminKind;
    }

    if (!capPayload.omitCapabilities && capPayload.capability_ids) {
      payload.capability_ids = capPayload.capability_ids;
    }

    if (capPayload.mergePayload) {
      payload.capability_update_mode = capPayload.mergePayload.capability_update_mode;
      payload.scopes = capPayload.mergePayload.scopes;
    }

    if (creating && showCreatePassword && assignPasswordNow) {
      payload.account = {
        create: true,
        login: resolveStaffAccountLogin({ email, login, useDifferentLogin }),
        password,
        password_confirm: confirmPassword,
      };
    }

    setSaving(true);
    const res = creating
      ? await createStaffMember(payload)
      : await updateStaffMember(memberId!, payload);
    setSaving(false);

    clearPasswordFields();

    if (!res.success) {
      const staffMsg = mapAcademicSetupApiError(res.error, t, 'staff');
      const accountMsg = mapAccountApiError(res.error, t);
      toast.error(staffMsg !== t('errors.serverError') ? staffMsg : accountMsg);
      return;
    }

    if (
      capPayload.capabilityChangesAttempted &&
      capPayload.mergePayload &&
      res.data
    ) {
      const expectedCodes = capabilityIdsToCodes(capabilityIds, options?.capabilities ?? []);
      const savedMember = normalizeStaffCenterMember(res.data);
      if (!responseIncludesCapabilityCodes(savedMember, expectedCodes)) {
        toast.error(t('admin.staffCenter.errors.permissionsSaveUnconfirmed'));
        onSaved();
        return;
      }
    }

    const feedback = resolveAccountMutationFeedback(res, t, {
      createdKey: 'admin.account.accountCreated',
      updatedKey: 'admin.saveSuccess',
      alreadyExistsKey: 'admin.account.accountAlreadyExists',
    });
    if (feedback) applyAccountMutationToasts(feedback, toast);
    else toast.success(t('admin.saveSuccess'));

    onSaved();
  }

  async function deactivate() {
    if (!memberId || !member) return;
    const message = `${t('admin.academicSetup.confirmDeactivateStaff')}\n\n${t('admin.academicSetup.deactivationPreservesAccount')}`;
    if (!window.confirm(message)) return;
    setSaving(true);
    const res = await deactivateStaffMember(memberId);
    setSaving(false);
    if (!res.success) {
      toast.error(mapAcademicSetupApiError(res.error, t, 'staff'));
      return;
    }
    const key = staffMutationSuccessKey(res.data?.action);
    toast.success(key ? t(key) : t('admin.actionSuccess'));
    onSaved();
  }

  const footer = (
    <div className="row" style={{ gap: 8, flexWrap: 'wrap', width: '100%' }}>
      {canManage && (
        <button
          type="submit"
          form={STAFF_FORM_ID}
          className="btn btn--primary btn--sm"
          disabled={saving || (!teacherOnlySelected && permissionScopesLoading)}
          style={{ minHeight: 44 }}
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
      )}
      {!creating && canManage && member && staffShowsDeactivate(member, canManage) && (
        <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={deactivate}>
          {t('admin.academicSetup.deactivateStaff')}
        </button>
      )}
      {!creating && canManage && member && staffShowsReactivate(member, canManage) && onReactivate && (
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={saving}
          style={{ minHeight: 44 }}
          onClick={() => onReactivate(member)}
        >
          {t('admin.academicSetup.reactivateStaff')}
        </button>
      )}
      <button type="button" className="btn btn--ghost btn--sm" onClick={handleClose}>
        {t('common.cancel')}
      </button>
    </div>
  );

  return (
    <>
      <SetupDrawer
        open={open}
        title={creating ? t('admin.academicSetup.addStaff') : t('admin.academicSetup.editStaff')}
        onClose={handleClose}
        size="medium"
        className="academic-setup-drawer--staff-form"
        footer={footer}
      >
        {drawerInitialLoading ? (
          <p className="muted">{t('common.loading')}</p>
        ) : (
          <form id={STAFF_FORM_ID} className="col staff-form-drawer" style={{ gap: 12 }} onSubmit={submit}>
            {!creating && accountEntity ? (
              <AccountStatusBadge entity={accountEntity} showLogin />
            ) : null}
            <label className="col" style={{ gap: 4 }}>
              <span className="tiny muted">{t('admin.fullName')}</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <AccountFieldsSection
              mode={creating ? 'create' : 'edit'}
              email={email}
              login={login}
              useDifferentLogin={useDifferentLogin}
              onEmailChange={setEmail}
              onLoginChange={setLogin}
              onUseDifferentLoginChange={setUseDifferentLogin}
              disabled={!canManage || saving}
            />
            {showCreatePassword ? (
              <StaffPasswordSection
                password={password}
                confirmPassword={confirmPassword}
                showPassword={showPassword}
                assignPasswordNow={assignPasswordNow}
                policy={passwordPolicy}
                errors={passwordErrors}
                disabled={!canManage || saving}
                onPasswordChange={setPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onShowPasswordChange={setShowPassword}
                onAssignPasswordNowChange={(next) => {
                  setAssignPasswordNow(next);
                  if (!next) clearPasswordFields();
                }}
              />
            ) : null}
            {!creating && showResetPassword ? (
              <div className="staff-password-section">
                <strong>{t('admin.academicSetup.staffPassword.resetTitle')}</strong>
                <p className="tiny muted">{t('admin.academicSetup.staffPassword.resetHint')}</p>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={!canManage || saving}
                  onClick={() => setResetDialogOpen(true)}
                >
                  {t('admin.academicSetup.staffPassword.resetAction')}
                </button>
              </div>
            ) : null}
            <label className="col" style={{ gap: 4 }}>
              <span className="tiny muted">{t('admin.phone')}</span>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="col" style={{ gap: 4 }}>
              <span className="tiny muted">{t('admin.academicSetup.jobTitle')}</span>
              <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </label>
            <label className="col" style={{ gap: 4 }}>
              <span className="tiny muted">{t('admin.academicSetup.adminKindLabel')}</span>
              <select
                className="input"
                value={adminKind}
                onChange={(e) => {
                  const value = e.target.value as StaffAdminKind | '';
                  setAdminKind(value);
                  if (!creating && hasTeacherProfile && value === '') {
                    setCapabilityIds(originalCapabilityIds);
                    setCapabilitiesTouched(false);
                  }
                }}
              >
                {!creating && hasTeacherProfile ? (
                  <option value="">{t('admin.academicSetup.teacherOnlyNoAdminRole')}</option>
                ) : null}
                {(options?.admin_kinds ?? []).map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </label>
            {teacherOnlySelected && originalAdminKind ? (
              <p className="staff-cap-role-change-warn" role="alert" aria-live="polite">
                {t('admin.academicSetup.teacherOnlyNoAdminRoleHint')}
              </p>
            ) : null}
            {roleChangeWarningKey ? (
              <p className="staff-cap-role-change-warn" role="alert" aria-live="polite">
                {t(roleChangeWarningKey)}
              </p>
            ) : null}
            {!teacherOnlySelected ? (
              <StaffCapabilitiesSection
                adminKind={adminKind || 'admin_staff'}
                permissionsMeta={permissionsContext}
                displayMode={permissionsContext.displayMode}
                capabilities={options?.capabilities ?? []}
                capabilityIds={capabilityIds}
                onCapabilityIdsChange={setCapabilityIds}
                catalogReady={catalogReady}
                catalogLoading={optionsLoading}
                catalogError={optionsError}
                onRetryCatalog={onRetryOptions}
                disabled={!canManage || saving || permissionScopesLoading}
                onCapabilitiesTouched={() => setCapabilitiesTouched(true)}
              />
            ) : null}
            {!teacherOnlySelected && permissionScopesLoading ? (
              <p className="tiny muted">{t('common.loading')}</p>
            ) : null}
          </form>
        )}
      </SetupDrawer>
      <StaffResetPasswordDialog
        open={resetDialogOpen}
        staffId={memberId}
        policy={passwordPolicy}
        onClose={() => setResetDialogOpen(false)}
      />
    </>
  );
}
