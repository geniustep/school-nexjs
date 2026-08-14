'use client';

import { DataTable, type Column } from '@/components/tables/data-table';
import { Badge } from '@/components/ui/primitives';
import { libraryActionAllowed, type LibraryTitleRow } from './library-contract';

export function LibraryCatalogTable({
  rows,
  pendingAction,
  onEdit,
  onArchive,
}: {
  rows: LibraryTitleRow[];
  pendingAction?: string | null;
  onEdit: (row: LibraryTitleRow) => void;
  onArchive: (row: LibraryTitleRow) => void;
}) {
  const columns: Column<LibraryTitleRow>[] = [
    {
      key: 'book',
      header: 'الكتاب',
      render: (row) => (
        <div className="library-identity">
          <span className="library-identity__title" dir="auto">{row.name}</span>
          <span className="library-identity__meta" dir="auto">{row.authors || 'مؤلف غير محدد'}</span>
        </div>
      ),
    },
    {
      key: 'publisher',
      header: 'الناشر',
      render: (row) => <span dir="auto">{row.publisher || '—'}</span>,
    },
    {
      key: 'isbn',
      header: 'ISBN',
      render: (row) => row.isbn ? <bdi className="mono" dir="ltr">{row.isbn}</bdi> : '—',
    },
    {
      key: 'policy',
      header: 'الإعارة',
      render: (row) => row.default_circulation_policy === 'loanable'
        ? <Badge tone="green">قابلة للإعارة</Badge>
        : <Badge tone="slate">داخل المكتبة</Badge>,
    },
    {
      key: 'availability',
      header: 'التوفر',
      render: (row) => (
        <span className="library-copy-availability">
          <strong><bdi dir="ltr">{row.available_copy_count}</bdi></strong>
          <span>متاحة من <bdi dir="ltr">{row.copy_count}</bdi></span>
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      label: 'الإجراءات',
      render: (row) => {
        const archiveKey = `title:${row.id}:archive`;
        const rowBusy = pendingAction === archiveKey;
        return (
          <div className="library-actions">
            {libraryActionAllowed(row.allowed_actions, 'edit') ? (
              <button type="button" disabled={rowBusy} className="btn btn--ghost btn--sm" onClick={() => onEdit(row)}>تعديل</button>
            ) : null}
            {libraryActionAllowed(row.allowed_actions, 'archive') ? (
              <button type="button" disabled={rowBusy} className="btn btn--ghost btn--sm library-action--danger" onClick={() => onArchive(row)}>
                {rowBusy ? 'جارٍ الأرشفة…' : 'أرشفة'}
              </button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return <div className="library-table"><DataTable columns={columns} rows={rows} rowKey={(row) => row.id} /></div>;
}
