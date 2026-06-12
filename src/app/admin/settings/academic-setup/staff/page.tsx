'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState, EmptyState } from '@/components/states/states';
import { AcademicPageHeader } from '@/features/admin/academic-setup/components/academic-page-header';
import { AcademicSearchField, AcademicToolbar } from '@/features/admin/academic-setup/components/academic-toolbar';
import { StaffCardGrid } from '@/features/admin/academic-setup/components/staff-card';
import { StaffFormDrawer } from '@/features/admin/academic-setup/components/staff-form-drawer';
import { useDrawerActionParam } from '@/features/admin/academic-setup/hooks/use-drawer-action-param';
import { useStaffList, useStaffOptions } from '@/features/admin/academic-setup/hooks/use-staff';
import { canManageStaff } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';

export default function AcademicSetupStaffPage() {
  const t = useT();
  const user = useSession();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const { openFromAction, dismissActionParam } = useDrawerActionParam('add');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(
    searchParams.get('id') ? Number(searchParams.get('id')) : null,
  );

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      limit: 100,
    }),
    [search],
  );

  const listState = useStaffList(query);
  const optionsState = useStaffOptions();
  const canManage = canManageStaff(user);

  const headerActions = canManage ? (
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
        <AcademicSearchField
          value={search}
          onChange={setSearch}
          placeholder={t('admin.academicSetup.searchStaff')}
          label={t('admin.academicSetup.searchStaff')}
        />
      </AcademicToolbar>

      {listState.staff.length === 0 ? (
        <EmptyState title={t('admin.academicSetup.noStaff')} />
      ) : (
        <StaffCardGrid
          members={listState.staff}
          onSelect={(id) => setEditId(id)}
          selectedId={editId}
        />
      )}
      <StaffFormDrawer
        open={drawerOpen || openFromAction || editId != null}
        memberId={drawerOpen && !editId ? null : editId}
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
      />
    </>
  );
}
