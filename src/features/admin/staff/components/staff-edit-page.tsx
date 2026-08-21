'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ResourceView } from '@/components/states/resource';
import { Card, PageHeader, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { AccountFieldsSection } from '@/features/admin/account/account-fields-section';
import { AccountStatusBadge } from '@/features/admin/account/account-status-badge';
import { StaffCapabilitiesSection } from '@/features/admin/academic-setup/components/staff-capabilities-section';
import { StaffResetPasswordDialog } from '@/features/admin/academic-setup/components/staff-reset-password-dialog';
import { TeacherSetupForm } from '@/features/admin/academic-setup/components/teacher-setup-form';
import { useStaffOptions, updateStaffMember } from '@/features/admin/academic-setup/hooks/use-staff';
import { mapAcademicSetupApiError } from '@/features/admin/academic-setup/utils/api-errors';
import {
  canResetStaffAccountPassword,
  normalizeStaffPasswordPolicy,
} from '@/features/admin/academic-setup/utils/staff-password-utils';
import {
  resolveRoleChangeWarningKey,
  resolveStaffPermissionMetadata,
} from '@/features/admin/academic-setup/utils/staff-permissions-meta';
import { resolveStaffLogin } from '@/features/admin/academic-setup/utils/staff-utils';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { useStaffCenterDetailWithPermissions } from '@/features/admin/staff/hooks/use-staff-center';
import {
  normalizeStaffCenterMember,
  resolveStaffDisplayName,
} from '@/features/admin/staff/utils/normalize-staff-center';
import {
  buildStaffPermissionSavePayload,
  canSaveStaffPermissionChanges,
  capabilityCodesToIds,
  capabilityIdsToCodes,
  resolveStoredCapabilityCodes,
  responseIncludesCapabilityCodes,
} from '@/features/admin/staff/utils/staff-permission-merge';
import { endpoints } from '@/lib/api/endpoints';
import { mapAccountApiError } from '@/lib/account/account-errors';
import {
  applyAccountMutationToasts,
  resolveAccountMutationFeedback,
} from '@/lib/account/account-mutation-feedback';
import { buildAccountIdentityPayload } from '@/lib/account/account-utils';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  canManageStaff,
  canManageTeachingAssignments,
} from '@/lib/permissions/academic-setup';
import type {
  StaffAdminKind,
  StaffEffectivePermissionsPayload,
  StaffMember,
} from '@/types/academic-setup';
import type { Teacher } from '@/types/teacher';
import '@/features/admin/staff/staff-center.css';
import '@/features/admin/academic-setup/academic-setup-ui.css';

function StaffIdentityAccessForm({
  member,
  staffUserId,
  permissionsPayload,
  canManage,
  onSaved,
}: {
  member: StaffMember;
  staffUserId: number;
  permissionsPayload: StaffEffectivePermissionsPayload | null;
  canManage: boolean;
  onSaved: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const optionsState = useStaffOptions();
  const options = optionsState.options;

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
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const memberEmail = member.email ?? '';
    const memberLogin = resolveStaffLogin(member);
    setName(member.name);
    setEmail(memberEmail);
    setLogin(memberLogin);
    setOriginalEmail(memberEmail);
    setOriginalLogin(memberLogin);
    setUseDifferentLogin(Boolean(memberLogin && memberEmail && memberLogin !== memberEmail));
    setPhone(member.mobile ?? member.phone ?? '');
    setJobTitle(member.job_title ?? '');

    const nextAdminKind =
      member.admin_kind && typeof member.admin_kind === 'string'
        ? (member.admin_kind as StaffAdminKind)
        : '';
    setAdminKind(nextAdminKind);
    setOriginalAdminKind(nextAdminKind);

    const storedCodes = resolveStoredCapabilityCodes(member, permissionsPayload);
    const resolvedIds = capabilityCodesToIds(storedCodes, options?.capabilities ?? []);
    setCapabilityIds(resolvedIds);
    setOriginalCapabilityIds(resolvedIds);
    setCapabilitiesTouched(false);
  }, [member, permissionsPayload, options?.capabilities]);

  const catalogReady = Boolean(options?.capabilities?.length);
  const hasTeacherProfile = Boolean(member.teacher_id || member.teacher?.id);
  const teacherOnlySelected = hasTeacherProfile && adminKind === '';
  const adminKindChanged = originalAdminKind !== '' && adminKind !== originalAdminKind;
  const passwordPolicy = useMemo(
    () => normalizeStaffPasswordPolicy(options?.password_policy),
    [options?.password_policy],
  );
  const showResetPassword = canResetStaffAccountPassword(options);

  const permissionsContext = useMemo(
    () =>
      resolveStaffPermissionMetadata({
        adminKind: (adminKind || 'admin_staff') as StaffAdminKind,
        member,
        options,
        preferMemberMetadata: !adminKindChanged && member.admin_kind === adminKind,
      }),
    [adminKind, member, options, adminKindChanged],
  );

  const roleChangeWarningKey =
    adminKindChanged && originalAdminKind && !teacherOnlySelected
      ? resolveRoleChangeWarningKey(
          originalAdminKind as StaffAdminKind,
          (adminKind || 'admin_staff') as StaffAdminKind,
          options,
        )
      : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage || saving) return;

    const identity = buildAccountIdentityPayload({
      email,
      login,
      originalEmail,
      originalLogin,
      useDifferentLogin,
      isCreate: false,
    });

    const capPayload = buildStaffPermissionSavePayload({
      isCreate: false,
      member,
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
      member,
      scopesLoading: false,
      capabilityChangesAttempted: capPayload.capabilityChangesAttempted,
    });
    if (!saveGuard.allowed && saveGuard.reason === 'missing_scope') {
      toast.error(t('admin.staffCenter.errors.scopesRequiredForCapabilityUpdate'));
      return;
    }
    if (capPayload.blockSaveMissingScope) {
      toast.error(t('admin.staffCenter.errors.scopesRequiredForCapabilityUpdate'));
      return;
    }
    if (capPayload.capabilityChangesAttempted && !capPayload.mergePayload?.scopes?.length) {
      toast.error(t('admin.staffCenter.errors.scopesRequiredForCapabilityUpdate'));
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      ...identity,
      phone: phone.trim() || undefined,
      job_title: jobTitle.trim() || undefined,
    };

    if (adminKind !== originalAdminKind) {
      payload.admin_kind = teacherOnlySelected ? null : adminKind;
    }
    if (!capPayload.omitCapabilities && capPayload.capability_ids) {
      payload.capability_ids = capPayload.capability_ids;
    }
    if (capPayload.mergePayload) {
      payload.capability_update_mode = capPayload.mergePayload.capability_update_mode;
      payload.scopes = capPayload.mergePayload.scopes;
    }

    setSaving(true);
    const res = await updateStaffMember(staffUserId, payload);
    setSaving(false);

    if (!res.success) {
      const staffMsg = mapAcademicSetupApiError(res.error, t, 'staff');
      const accountMsg = mapAccountApiError(res.error, t);
      toast.error(staffMsg !== t('errors.serverError') ? staffMsg : accountMsg);
      return;
    }

    if (capPayload.capabilityChangesAttempted && capPayload.mergePayload && res.data) {
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

  return (
    <>
      <form onSubmit={submit} className="col" style={{ gap: 16 }}>
        <Card className="staff-center-section">
          <SectionHead title={t('admin.staffCenter.identityTitle')} />
          <div className="col" style={{ gap: 12 }}>
            <AccountStatusBadge entity={member} showLogin />
            <label className="col" style={{ gap: 4 }}>
              <span className="tiny muted">{t('admin.fullName')}</span>
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={!canManage || saving}
              />
            </label>

            <AccountFieldsSection
              mode="edit"
              email={email}
              login={login}
              useDifferentLogin={useDifferentLogin}
              onEmailChange={setEmail}
              onLoginChange={setLogin}
              onUseDifferentLoginChange={setUseDifferentLogin}
              disabled={!canManage || saving}
            />

            {showResetPassword ? (
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

            <div className="staff-center-detail-grid">
              <label className="col" style={{ gap: 4 }}>
                <span className="tiny muted">{t('admin.phone')}</span>
                <input
                  className="input"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={!canManage || saving}
                />
              </label>
              <label className="col" style={{ gap: 4 }}>
                <span className="tiny muted">{t('admin.academicSetup.jobTitle')}</span>
                <input
                  className="input"
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  disabled={!canManage || saving}
                />
              </label>
            </div>
          </div>
        </Card>

        <Card className="staff-center-section">
          <SectionHead title={t('admin.staffCenter.permissionsTitle')} />
          <div className="col" style={{ gap: 12 }}>
            <label className="col" style={{ gap: 4 }}>
              <span className="tiny muted">{t('admin.academicSetup.adminKindLabel')}</span>
              <select
                className="input"
                value={adminKind}
                disabled={!canManage || saving}
                onChange={(event) => {
                  const value = event.target.value as StaffAdminKind | '';
                  setAdminKind(value);
                  if (hasTeacherProfile && value === '') {
                    setCapabilityIds(originalCapabilityIds);
                    setCapabilitiesTouched(false);
                  }
                }}
              >
                {hasTeacherProfile ? (
                  <option value="">{t('admin.academicSetup.teacherOnlyNoAdminRole')}</option>
                ) : null}
                {(options?.admin_kinds ?? []).map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>
            </label>

            {teacherOnlySelected && originalAdminKind ? (
              <p className="staff-cap-role-change-warn" role="alert">
                {t('admin.academicSetup.teacherOnlyNoAdminRoleHint')}
              </p>
            ) : null}
            {roleChangeWarningKey ? (
              <p className="staff-cap-role-change-warn" role="alert">
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
                catalogLoading={optionsState.loading}
                catalogError={optionsState.error?.message ?? null}
                onRetryCatalog={() => optionsState.reload()}
                disabled={!canManage || saving}
                onCapabilitiesTouched={() => setCapabilitiesTouched(true)}
              />
            ) : null}
          </div>
        </Card>

        <div className="row" style={{ gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Link href={`/admin/staff/${staffUserId}`} className="btn btn--ghost btn--sm">
            {t('common.cancel')}
          </Link>
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            disabled={!canManage || saving || optionsState.loading}
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>

      <StaffResetPasswordDialog
        open={resetDialogOpen}
        staffId={staffUserId}
        policy={passwordPolicy}
        onClose={() => setResetDialogOpen(false)}
      />
    </>
  );
}

function StaffTeacherEditSection({
  teacherId,
  staffUserId,
  onSaved,
}: {
  teacherId: number;
  staffUserId: number;
  onSaved: () => void;
}) {
  const t = useT();
  const sessionUser = useSession();
  const canManageAssignments = canManageTeachingAssignments(sessionUser);
  const teacherState = useAdminResource<Teacher>(endpoints.admin.teacher(teacherId));

  if (teacherState.loading && !teacherState.data) {
    return (
      <Card className="staff-center-section">
        <p className="muted">{t('common.loading')}</p>
      </Card>
    );
  }

  if (teacherState.error) {
    return (
      <Card className="staff-center-section">
        <p role="alert">{teacherState.error.message}</p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={teacherState.reload}>
          {t('common.retry')}
        </button>
      </Card>
    );
  }

  if (!teacherState.data) return null;

  return (
    <Card className="staff-center-section">
      <SectionHead title={t('admin.teacherDomain.tabs.assignments')} />
      <p className="tiny muted" style={{ marginBottom: 12 }}>
        {t('admin.academicSetup.teacherAssignmentMatrix.subjectsHint')}
      </p>
      <TeacherSetupForm
        teacher={teacherState.data}
        layout="page"
        initialStep="assignments"
        canManageAssignments={canManageAssignments}
        onSaved={() => {
          teacherState.reload();
          onSaved();
        }}
        onCancel={() => {
          window.location.href = `/admin/staff/${staffUserId}`;
        }}
      />
    </Card>
  );
}

export function StaffEditPage({ userId }: { userId: number }) {
  const t = useT();
  const sessionUser = useSession();
  const canManage = canManageStaff(sessionUser);
  const detailState = useStaffCenterDetailWithPermissions(userId);

  const viewState = useMemo(
    () => ({
      loading: detailState.loading,
      initialLoading: detailState.loading && detailState.member == null,
      fetching: detailState.loading && detailState.member != null,
      data: detailState.member,
      meta: null,
      error: detailState.error,
      reload: detailState.reload,
    }),
    [detailState],
  );

  return (
    <div className="admin-workspace staff-center-page">
      <Link href={`/admin/staff/${userId}`} className="back-link">
        ‹ {t('common.cancel')}
      </Link>

      <ResourceView state={viewState} loadingLabel={t('common.loading')}>
        {(member: StaffMember) => {
          const teacherId = member.teacher_id ?? member.teacher?.id ?? null;

          return (
            <>
              <PageHeader
                title={t('admin.academicSetup.editStaff')}
                subtitle={resolveStaffDisplayName(member)}
                actions={
                  <Link href={`/admin/staff/${userId}`} className="btn btn--ghost btn--sm">
                    {t('common.cancel')}
                  </Link>
                }
              />

              {!canManage ? (
                <Card className="staff-center-section">
                  <p role="alert">{t('errors.forbidden')}</p>
                </Card>
              ) : (
                <div className="col" style={{ gap: 20 }}>
                  <StaffIdentityAccessForm
                    member={member}
                    staffUserId={userId}
                    permissionsPayload={detailState.permissionsPayload}
                    canManage={canManage}
                    onSaved={detailState.reload}
                  />

                  {teacherId ? (
                    <StaffTeacherEditSection
                      teacherId={teacherId}
                      staffUserId={userId}
                      onSaved={detailState.reload}
                    />
                  ) : null}
                </div>
              )}
            </>
          );
        }}
      </ResourceView>
    </div>
  );
}
