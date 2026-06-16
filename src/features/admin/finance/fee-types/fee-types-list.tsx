'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { Badge } from '@/components/ui/primitives';
import { FeeTypeArchiveDialog, FeeTypeRestoreDialog } from '@/features/admin/finance/fee-types/fee-type-action-dialogs';
import { FeeTypeActionsMenu } from '@/features/admin/finance/fee-types/fee-type-actions-menu';
import { FeeTypeDeleteDialog } from '@/features/admin/finance/fee-types/fee-type-delete-dialog';
import { FeeTypeEditDrawer } from '@/features/admin/finance/fee-types/fee-type-edit-drawer';
import { feeTypeCategoryLabel } from '@/features/admin/finance/fee-types/fee-type-labels';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { appendReturnTo } from '@/lib/utils/safe-return-url';
import type { FeeType, FeeTypeDetail } from '@/types/finance';

export function FeeTypesList({
  rows,
  pagination,
  listReturnTo,
  embedded = false,
  onView,
  onPage,
  onReload,
  onDeleted,
}: {
  rows: FeeType[];
  pagination?: { page: number; total_pages: number; total: number };
  listReturnTo: string;
  embedded?: boolean;
  onView: (row: FeeType) => void;
  onPage: (page: number) => void;
  onReload: () => void;
  onDeleted: () => void;
}) {
  const t = useT();
  const [actionRow, setActionRow] = useState<FeeType | null>(null);
  const [editDetail, setEditDetail] = useState<FeeTypeDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const detailHref = useCallback(
    (row: FeeType) => appendReturnTo(`/admin/finance/fee-types/${row.id}`, listReturnTo),
    [listReturnTo],
  );

  const openEdit = useCallback(async (row: FeeType) => {
    setLoadingEdit(true);
    const res = await api.get<FeeTypeDetail>(endpoints.admin.financeFeeType(row.id));
    setLoadingEdit(false);
    if (res.success && res.data) {
      setEditDetail(res.data);
      setActionRow(row);
      setEditOpen(true);
    }
  }, []);

  const handleRowClick = embedded ? (row: FeeType) => void openEdit(row) : onView;

  const columns: Column<FeeType>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.finance.feeTypeName'),
        render: (row) =>
          embedded ? (
            <strong dir="auto">{row.name}</strong>
          ) : (
            <Link href={detailHref(row)} className="fee-type-list__name-link" onClick={(e) => e.stopPropagation()}>
              <strong dir="auto">{row.name}</strong>
            </Link>
          ),
      },
      {
        key: 'code',
        header: t('admin.finance.feeTypeCode'),
        render: (row) => (
          <span className="mono" dir="ltr">
            {row.code}
          </span>
        ),
      },
      {
        key: 'category',
        header: t('admin.finance.category'),
        render: (row) => feeTypeCategoryLabel(row.category, t),
      },
      {
        key: 'active',
        header: t('academic.status'),
        render: (row) => (
          <Badge tone={row.active ? 'green' : 'slate'}>
            {row.active ? t('states.active') : t('states.archived')}
          </Badge>
        ),
      },
      {
        key: 'usage',
        header: t('admin.finance.feeTypesWorkspace.usageColumn'),
        render: (row) =>
          row.usage_summary?.is_used || row.usage_summary?.historical_usage ? (
            <Badge tone="amber">{t('admin.finance.feeTypesWorkspace.usageStatusUsed')}</Badge>
          ) : (
            <Badge tone="slate">{t('admin.finance.feeTypesWorkspace.usageStatusUnused')}</Badge>
          ),
      },
      {
        key: 'actions',
        header: t('admin.actions'),
        render: (row) => (
          <FeeTypeActionsMenu
            feeType={row}
            onView={embedded ? () => void openEdit(row) : () => onView(row)}
            onEdit={() => void openEdit(row)}
            onArchive={() => {
              setActionRow(row);
              setArchiveOpen(true);
            }}
            onRestore={() => {
              setActionRow(row);
              setRestoreOpen(true);
            }}
            onDelete={() => {
              setActionRow(row);
              setDeleteOpen(true);
            }}
          />
        ),
      },
    ],
    [t, detailHref, embedded, onView, openEdit],
  );

  return (
    <>
      <div className="fee-types-list__desktop" data-testid="fee-types-table">
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} onRowClick={handleRowClick} />
      </div>

      <div className="fee-types-list__mobile" data-testid="fee-types-cards">
        {rows.map((row) => (
          <article key={row.id} className="card fee-type-card" onClick={() => handleRowClick(row)}>
            <div className="fee-type-card__head">
              {embedded ? (
                <strong dir="auto">{row.name}</strong>
              ) : (
                <Link
                  href={detailHref(row)}
                  className="fee-type-list__name-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  <strong dir="auto">{row.name}</strong>
                </Link>
              )}
              <Badge tone={row.active ? 'green' : 'slate'}>
                {row.active ? t('states.active') : t('states.archived')}
              </Badge>
            </div>
            <p className="mono muted" dir="ltr">
              {row.code}
            </p>
            <dl className="detail-list compact">
              <div>
                <dt>{t('admin.finance.category')}</dt>
                <dd>{feeTypeCategoryLabel(row.category, t)}</dd>
              </div>
            </dl>
            <div className="fee-type-card__actions" onClick={(e) => e.stopPropagation()}>
              <FeeTypeActionsMenu
                feeType={row}
                onView={embedded ? () => void openEdit(row) : () => onView(row)}
                onEdit={() => void openEdit(row)}
                onArchive={() => {
                  setActionRow(row);
                  setArchiveOpen(true);
                }}
                onRestore={() => {
                  setActionRow(row);
                  setRestoreOpen(true);
                }}
                onDelete={() => {
                  setActionRow(row);
                  setDeleteOpen(true);
                }}
              />
            </div>
          </article>
        ))}
      </div>

      {pagination && pagination.total > 0 ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          total={pagination.total}
          onPage={onPage}
        />
      ) : null}

      {loadingEdit ? <p className="sr-only">{t('common.loading')}</p> : null}

      {editDetail ? (
        <FeeTypeEditDrawer
          open={editOpen}
          feeType={editDetail}
          onClose={() => {
            setEditOpen(false);
            setEditDetail(null);
          }}
          onSaved={() => {
            setEditOpen(false);
            setEditDetail(null);
            onReload();
          }}
        />
      ) : null}

      {actionRow ? (
        <>
          <FeeTypeArchiveDialog
            open={archiveOpen}
            feeType={actionRow}
            onClose={() => setArchiveOpen(false)}
            onSuccess={() => {
              setArchiveOpen(false);
              onReload();
            }}
          />
          <FeeTypeRestoreDialog
            open={restoreOpen}
            feeType={actionRow}
            onClose={() => setRestoreOpen(false)}
            onSuccess={() => {
              setRestoreOpen(false);
              onReload();
            }}
          />
          <FeeTypeDeleteDialog
            open={deleteOpen}
            feeType={actionRow}
            onClose={() => setDeleteOpen(false)}
            onDeleted={() => {
              setDeleteOpen(false);
              onDeleted();
            }}
            onArchiveInstead={() => {
              setDeleteOpen(false);
              setArchiveOpen(true);
            }}
          />
        </>
      ) : null}
    </>
  );
}
