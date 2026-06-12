'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState, EmptyState } from '@/components/states/states';
import { AcademicPageHeader } from '@/features/admin/academic-setup/components/academic-page-header';
import { AcademicSearchField, AcademicToolbar } from '@/features/admin/academic-setup/components/academic-toolbar';
import { AcademicSegmentedControl } from '@/features/admin/academic-setup/components/academic-segmented-control';
import { StaffCardGrid } from '@/features/admin/academic-setup/components/staff-card';
import { StaffFormDrawer } from '@/features/admin/academic-setup/components/staff-form-drawer';
import { StaffReactivateDialog } from '@/features/admin/academic-setup/components/staff-reactivate-dialog';
import { useDrawerActionParam } from '@/features/admin/academic-setup/hooks/use-drawer-action-param';
import { useStaffList, useStaffOptions } from '@/features/admin/academic-setup/hooks/use-staff';
import {
  buildStaffListQuery,
  parseStaffStatusFilter,
  staffEmptyStateKey,
} from '@/features/admin/academic-setup/utils/staff-utils';
import { canManageStaff } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import type { StaffMember, StaffStatusFilter } from '@/types/academic-setup';

export default function AcademicSetupStaffPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const statusFromUrl = parseStaffStatusFilter(searchParams.get('status'));
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>(statusFromUrl);
  const { openFromAction, dismissActionParam } = useDrawerActionParam('add');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(
    searchParams.get('id') ? Number(searchParams.get('id')) : null,
  );
  const [reactivateMember, setReactivateMember] = useState<StaffMember | null>(null);

  useEffect(() => {
    setStatusFilter(statusFromUrl);
  }, [statusFromUrl]);

  const syncQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === '') params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const query = useMemo(
    () => buildStaffListQuery({ status: statusFilter, search, limit: 100 }),
    [statusFilter, search],
  );

  const listState = useStaffList(query);
  const optionsState = useStaffOptions();
  const canManage = canManageStaff(user);
  const editMember = editId != null ? listState.staff.find((m) => m.id === editId) : undefined;
  const hasSearch = search.trim().length > 0;

  const statusOptions = useMemo(
    () => [
      { value: 'active' as const, label: t('admin.academicSetup.activeStaff') },
      { value: 'inactive' as const, label: t('admin.academicSetup.inactiveStaff') },
      { value: 'all' as const, label: t('admin.academicSetup.allStaff') },
    ],
    [t],
  );

  function handleStatusChange(next: StaffStatusFilter) {
    setStatusFilter(next);
    syncQuery({ status: next === 'active' ? null : next });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    syncQuery({ search: value.trim() || null });
  }

  const headerActions = canManage && statusFilter !== 'inactive' ? (
    <button type="button" className="btn btn--primary" onClick={() => setDrawerOpen(true)}>
      {t('admin.academicSetup.addStaff')}
    </button>
  ) : undefined;

  if (listState.loading || optionsState.loading) {
    return (
      <>
        <AcademicPageHeader title={t('admin.academicSetup.staffPageTitle')} skeleton />
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (listState.error || optionsState.error) {
    return (
      <>
        <AcademicPageHeader title={t('admin.academicSetup.staffPageTitle')} />
        <ErrorState error={listState.error ?? optionsState.error!} onRetry={() => { listState.reload(); optionsState.reload(); }} />
      </>
    );
  }

  return (
    <>
      <AcademicPageHeader
        title={t('admin.academicSetup.staffPageTitle')}
        subtitle={t('admin.academicSetup.staffPageSubtitle')}
        stats={t('admin.academicSetup.staffPageStats', { count: listState.staff.length })}
        actions={headerActions}
      />

      <AcademicToolbar>
        <AcademicSegmentedControl
          ariaLabel={t('admin.academicSetup.staffStatusFilter')}
          options={statusOptions}
          value={statusFilter}
          onChange={handleStatusChange}
        />
        <AcademicSearchField
          value={search}
          onChange={handleSearchChange}
          placeholder={t('admin.academicSetup.searchStaff')}
          label={t('admin.academicSetup.searchStaff')}
        />
      </AcademicToolbar>

      {listState.staff.length === 0 ? (
        <EmptyState title={t(staffEmptyStateKey(statusFilter, hasSearch))} />
      ) : (
        <StaffCardGrid
          members={listState.staff}
          canManage={canManage}
          onSelect={(id) => setEditId(id)}
          selectedId={editId}
          onReactivate={(member) => setReactivateMember(member)}
        />
      )}
      <StaffFormDrawer
        open={drawerOpen || openFromAction || editId != null}
        memberId={drawerOpen && !editId ? null : editId}
        member={editMember}
        options={optionsState.options ?? undefined}
        canManage={canManage}
        onClose={() => {
          setDrawerOpen(false);
          setEditId(null);
          dismissActionParam();
        }}
        onSaved={() => {
          listState.reload();
          setDrawerOpen(false);
          setEditId(null);
          dismissActionParam();
        }}
        onReactivate={(member) => {
          setReactivateMember(member);
        }}
      />
      <StaffReactivateDialog
        open={reactivateMember != null}
        member={reactivateMember}
        onClose={() => setReactivateMember(null)}
        onSuccess={() => {
          listState.reload();
          setEditId(null);
          setDrawerOpen(false);
        }}
      />
    </>
  );
}
