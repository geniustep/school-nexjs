'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { StaffAllowedActionsBadges } from '@/features/admin/staff/components/staff-allowed-actions-bar';
import { useStaffCenterList } from '@/features/admin/staff/hooks/use-staff-center';
import {
  isStaffCenterParent,
  resolveStaffDisplayName,
  resolveStaffPrimarySchoolName,
  resolveStaffUserId,
  staffUserTypeLabelKeys,
} from '@/features/admin/staff/utils/normalize-staff-center';
import { staffWarningCount } from '@/features/admin/staff/utils/staff-warnings';
import { resolveStaffAdminKindLabel } from '@/features/admin/academic-setup/utils/staff-present';
import { isStaffInactive } from '@/features/admin/academic-setup/utils/staff-utils';
import { canManageStaff } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import type { StaffMember } from '@/types/academic-setup';
import '@/features/admin/staff/staff-center.css';

export function StaffListPage() {
  const router = useRouter();
  const user = useSession();
  const t = useT();
  const canManage = canManageStaff(user);
  const [search, setSearch] = useState('');
  const listState = useStaffCenterList({ limit: 200 });
  const resourceState = useMemo(
    () => ({
      loading: listState.loading,
      initialLoading: listState.initialLoading,
      fetching: listState.fetching,
      data: listState.initialLoading ? null : listState.staff,
      meta: listState.meta,
      error: listState.error,
      reload: listState.reload,
    }),
    [listState],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listState.staff;
    return listState.staff.filter((member) => {
      const haystack = [
        resolveStaffDisplayName(member),
        member.email,
        member.login,
        member.mobile,
        member.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [listState.staff, search]);

  const columns: Column<StaffMember>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.fullName'),
        render: (member) => (
          <strong dir="auto">{resolveStaffDisplayName(member)}</strong>
        ),
      },
      {
        key: 'type',
        header: t('admin.staffCenter.userTypeLabel'),
        render: (member) => (
          <div className="staff-center-type-badges">
            {staffUserTypeLabelKeys(member).map((key) => (
              <Badge key={key} tone={isStaffCenterParent(member) ? 'slate' : 'blue'}>
                {t(key)}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        key: 'admin_kind',
        header: t('admin.staffCenter.adminKind'),
        render: (member) =>
          // Parents are not admin kinds — ignore misleading admin_kind from Backend.
          isStaffCenterParent(member) || !member.admin_kind
            ? t('common.dash')
            : resolveStaffAdminKindLabel(member.admin_kind, t),
      },
      {
        key: 'school',
        header: t('admin.staffCenter.primarySchool'),
        render: (member) => resolveStaffPrimarySchoolName(member) ?? t('common.dash'),
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (member) => (
          <Badge tone={isStaffInactive(member) ? 'amber' : 'green'}>
            {statusLabel(t, member.status ?? member.account_status)}
          </Badge>
        ),
      },
      {
        key: 'account',
        header: t('admin.staffCenter.hasAccount'),
        render: (member) =>
          member.user_id || member.account || member.login
            ? t('common.yes')
            : t('common.no'),
      },
      {
        key: 'teacher',
        header: t('admin.staffCenter.isTeacher'),
        render: (member) => (member.is_teacher || member.teacher_id ? t('common.yes') : t('common.no')),
      },
      {
        key: 'warnings',
        header: t('admin.staffCenter.warningsCount'),
        render: (member) => {
          const count = staffWarningCount(member);
          return count ? <Badge tone="amber">{count}</Badge> : t('common.dash');
        },
      },
      {
        key: 'actions',
        header: t('admin.staffCenter.allowedActions'),
        render: (member) => <StaffAllowedActionsBadges member={member} />,
      },
    ],
    [t],
  );

  return (
    <div className="admin-workspace staff-center-page">
      <PageHeader
        title={t('admin.staffCenter.pageTitle')}
        subtitle={t('admin.staffCenter.pageSubtitle')}
        actions={
          canManage ? (
            <Link href="/admin/staff/create" className="btn btn--primary btn--sm">
              + {t('admin.staffCenter.smartCreate.entryButton')}
            </Link>
          ) : undefined
        }
      />

      <div className="toolbar">
        <input
          className="input staff-center-toolbar__search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('admin.staffCenter.searchPlaceholder')}
          aria-label={t('admin.staffCenter.searchPlaceholder')}
        />
      </div>

      <ResourceView
        state={resourceState}
        loadingLabel={t('common.loading')}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            icon="🧑‍💼"
            title={t('admin.staffCenter.emptyTitle')}
            description={t('admin.staffCenter.emptyDesc')}
          />
        }
      >
        {(staff) => (
          filtered.length === 0 && search.trim() ? (
            <EmptyState
              icon="🔍"
              title={t('admin.staffCenter.searchNoMatch')}
              compact
            />
          ) : (
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={(member) => resolveStaffUserId(member)}
              onRowClick={(member) => router.push(`/admin/staff/${resolveStaffUserId(member)}`)}
            />
          )
        )}
      </ResourceView>
    </div>
  );
}
