'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState, EmptyState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
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

  if (listState.loading || optionsState.loading) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.staff')} />
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (listState.error || optionsState.error) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.staff')} />
        <ErrorState error={listState.error ?? optionsState.error!} onRetry={() => { listState.reload(); optionsState.reload(); }} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('admin.academicSetup.nav.staff')}
        subtitle={t('admin.academicSetup.staffDesc')}
        actions={
          canManage ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setDrawerOpen(true)}>
              + {t('admin.academicSetup.addStaff')}
            </button>
          ) : undefined
        }
      />
      <input
        className="input"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('admin.academicSetup.searchStaff')}
        aria-label={t('admin.academicSetup.searchStaff')}
      />
      {listState.staff.length === 0 ? (
        <EmptyState icon="🧑‍💼" title={t('admin.academicSetup.noStaff')} />
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
