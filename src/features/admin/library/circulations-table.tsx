'use client';

import { DataTable, type Column } from '@/components/tables/data-table';
import { Badge } from '@/components/ui/primitives';
import { libraryStateLabel, type LibraryCirculationRow } from './library-contract';

export function LibraryCirculationsTable({
  rows,
  canAct,
  onAction,
}: {
  rows: LibraryCirculationRow[];
  canAct: boolean;
  onAction: (loan: LibraryCirculationRow) => void;
}) {
  const columns: Column<LibraryCirculationRow>[] = [
    {
      key: 'book',
      header: 'الكتاب',
      render: (row) => (
        <div className="library-identity">
          <span className="library-identity__title" dir="auto">{row.title.name}</span>
          <span className="library-identity__meta">نسخة <bdi className="mono" dir="auto">{row.copy.accession}</bdi></span>
        </div>
      ),
    },
    {
      key: 'patron',
      header: 'المستعير',
      render: (row) => <span dir="auto">{row.patron_name || '—'}</span>,
    },
    {
      key: 'dates',
      header: 'المدة',
      render: (row) => (
        <div className="library-code-stack">
          <span><bdi dir="ltr">{row.checked_out_at?.slice(0, 10) || '—'}</bdi></span>
          <span className={row.overdue ? 'tiny library-overdue' : 'tiny muted'}>حتى <bdi dir="ltr">{row.due_at?.slice(0, 10) || '—'}</bdi></span>
        </div>
      ),
    },
    {
      key: 'state',
      header: 'الحالة',
      render: (row) => row.overdue
        ? <Badge tone="red">متأخرة</Badge>
        : row.state === 'returned'
          ? <Badge tone="slate">مُعادة</Badge>
          : <Badge tone="blue">{libraryStateLabel[row.state] || row.state}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      label: 'الإجراءات',
      render: (row) => canAct && row.allowed_actions?.return
        ? <div className="library-actions"><button type="button" className="btn btn--primary btn--sm" onClick={() => onAction(row)}>استرجاع</button></div>
        : null,
    },
  ];

  return <div className="library-table"><DataTable columns={columns} rows={rows} rowKey={(row) => row.id} /></div>;
}
