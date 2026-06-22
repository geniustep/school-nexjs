'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { AccountStatusBadge } from '@/features/admin/account/account-status-badge';
import { StaffReactivateDialog } from '@/features/admin/academic-setup/components/staff-reactivate-dialog';
import { StaffFormDrawer } from '@/features/admin/academic-setup/components/staff-form-drawer';
import { useStaffOptions } from '@/features/admin/academic-setup/hooks/use-staff';
import { resolveStaffAdminKindLabel } from '@/features/admin/academic-setup/utils/staff-present';
import { isStaffInactive, resolveStaffLogin } from '@/features/admin/academic-setup/utils/staff-utils';
import { canManageStaff } from '@/lib/permissions/academic-setup';
import { StaffAllowedActionsBar } from '@/features/admin/staff/components/staff-allowed-actions-bar';
import {
  StaffPermissionsSection,
  StaffRoleTemplatesSection,
  StaffScopesSection,
} from '@/features/admin/staff/components/staff-permissions-section';
import { StaffTeacherSection } from '@/features/admin/staff/components/staff-teacher-section';
import { StaffAccountPasswordBanner } from '@/features/admin/staff/components/staff-account-password-banner';
import { StaffWarningsPanel } from '@/features/admin/staff/components/staff-warnings-panel';
import { useStaffCenterDetailWithPermissions } from '@/features/admin/staff/hooks/use-staff-center';
import {
  resolveStaffDisplayName,
  resolveStaffPrimarySchoolName,
  resolveStaffUserId,
  staffUserTypeLabelKeys,
} from '@/features/admin/staff/utils/normalize-staff-center';
import { resolveStaffCreationTemplateLabel, resolveStaffRoleDisplayLabel } from '@/features/admin/staff/utils/staff-center-present';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import type { StaffMember } from '@/types/academic-setup';
import '@/features/admin/staff/staff-center.css';

export function StaffDetailPage({ userId }: { userId: number }) {
  const t = useT();
  const sessionUser = useSession();
  const canManage = canManageStaff(sessionUser);
  const detailState = useStaffCenterDetailWithPermissions(userId);
  const optionsState = useStaffOptions();
  const [editOpen, setEditOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);

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
      <Link href="/admin/staff" className="back-link">
        ‹ {t('admin.staffCenter.backToList')}
      </Link>

      <ResourceView state={viewState} loadingLabel={t('common.loading')}>
        {(member: StaffMember) => (
          <>
            <PageHeader
              title={resolveStaffDisplayName(member)}
              subtitle={resolveStaffLogin(member) || member.email || undefined}
              actions={
                <div className="col" style={{ gap: 8, alignItems: 'flex-end' }}>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {member.role_display_name?.trim() ? (
                      <Badge key="role-display" tone="blue">
                        {resolveStaffRoleDisplayLabel(member, t)}
                      </Badge>
                    ) : (
                      staffUserTypeLabelKeys(member).map((key) => (
                        <Badge key={key} tone="blue">
                          {t(key)}
                        </Badge>
                      ))
                    )}
                    <Badge tone={isStaffInactive(member) ? 'amber' : 'green'}>
                      {statusLabel(t, member.status ?? member.account_status)}
                    </Badge>
                  </div>
                  <StaffAllowedActionsBar
                    member={member}
                    userId={resolveStaffUserId(member)}
                    onEdit={canManage ? () => setEditOpen(true) : undefined}
                    onDeactivate={canManage ? () => setEditOpen(true) : undefined}
                    onReactivate={canManage ? () => setReactivateOpen(true) : undefined}
                  />
                </div>
              }
            />

            <StaffWarningsPanel warnings={member.warnings} />
            <StaffAccountPasswordBanner member={member} onSetPassword={() => setEditOpen(true)} />

            <div className="staff-center-detail-grid">
              <Card className="staff-center-section">
                <SectionHead title={t('admin.staffCenter.identityTitle')} />
                <DefinitionList
                  items={[
                    { label: t('admin.fullName'), value: resolveStaffDisplayName(member) },
                    { label: t('admin.staffCenter.userId'), value: resolveStaffUserId(member) },
                    {
                      label: t('admin.staffCenter.partnerId'),
                      value: member.partner_id ?? t('common.dash'),
                    },
                    { label: t('admin.phone'), value: member.mobile ?? member.phone ?? t('common.dash') },
                    { label: t('admin.email'), value: member.email ?? t('common.dash') },
                    {
                      label: t('admin.staffCenter.primarySchool'),
                      value: resolveStaffPrimarySchoolName(member) ?? t('common.dash'),
                    },
                    {
                      label: t('admin.staffCenter.schools'),
                      value: member.schools?.length
                        ? member.schools.map((school) => school.name).join(', ')
                        : t('common.dash'),
                    },
                  ]}
                />
              </Card>

              <Card className="staff-center-section">
                <SectionHead title={t('admin.staffCenter.accountTitle')} />
                <DefinitionList
                  items={[
                    {
                      label: t('admin.account.loginName'),
                      value: resolveStaffLogin(member) || t('common.dash'),
                    },
                    {
                      label: t('academic.status'),
                      value: member.account?.status ? (
                        <AccountStatusBadge status={member.account.status} />
                      ) : (
                        <Badge tone={isStaffInactive(member) ? 'amber' : 'green'}>
                          {statusLabel(t, member.status ?? member.account_status)}
                        </Badge>
                      ),
                    },
                    {
                      label: t('admin.staffCenter.hasAccount'),
                      value:
                        member.user_id || member.account || member.login
                          ? t('common.yes')
                          : t('common.no'),
                    },
                    {
                      label: t('admin.staffCenter.roleType'),
                      value: resolveStaffRoleDisplayLabel(member, t),
                    },
                    {
                      label: t('admin.staffCenter.creationTemplate'),
                      value: member.creation_template_code
                        ? resolveStaffCreationTemplateLabel(member.creation_template_code, t) ||
                          t('common.dash')
                        : t('common.dash'),
                    },
                    {
                      label: t('admin.staffCenter.adminKind'),
                      value: member.admin_kind
                        ? resolveStaffAdminKindLabel(member.admin_kind, t)
                        : t('common.dash'),
                    },
                  ]}
                />
              </Card>
            </div>

            <StaffRoleTemplatesSection member={member} />
            <StaffScopesSection member={member} />
            <StaffPermissionsSection member={member} payload={detailState.permissionsPayload} />
            <StaffTeacherSection member={member} />

            <Card className="staff-center-section">
              <SectionHead title={t('admin.staffCenter.operationalNotesTitle')} />
              <p className="muted">{t('admin.staffCenter.operationalNotesDesc')}</p>
            </Card>

            <StaffFormDrawer
              open={editOpen}
              memberId={resolveStaffUserId(member)}
              member={member}
              options={optionsState.options ?? undefined}
              optionsLoading={optionsState.loading}
              optionsError={optionsState.error?.message ?? null}
              onRetryOptions={() => optionsState.reload()}
              canManage={canManage}
              onClose={() => setEditOpen(false)}
              onSaved={() => {
                setEditOpen(false);
                detailState.reload();
              }}
              onReactivate={() => {
                setEditOpen(false);
                setReactivateOpen(true);
              }}
            />

            <StaffReactivateDialog
              open={reactivateOpen}
              member={member}
              onClose={() => setReactivateOpen(false)}
              onSuccess={() => {
                setReactivateOpen(false);
                detailState.reload();
              }}
            />
          </>
        )}
      </ResourceView>
    </div>
  );
}

export function StaffDetailRoutePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const parsed = Number(userId);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return <StaffDetailPage userId={parsed} />;
}
