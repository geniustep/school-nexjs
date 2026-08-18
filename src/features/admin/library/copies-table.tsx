'use client';

import { DataTable, type Column } from '@/components/tables/data-table';
import { Badge } from '@/components/ui/primitives';
import {
  libraryActionAllowed,
  libraryConditionLabel,
  libraryCopyActionLabel,
  libraryStateLabel,
  type LibraryCopyAction,
  type LibraryCopyRow,
} from './library-contract';

const lifecycleActions: LibraryCopyAction[] = [
  'mark_lost',
  'mark_damaged',
  'send_to_repair',
  'restore',
  'withdraw',
];

function stateTone(state: string): 'green' | 'red' | 'amber' | 'blue' | 'slate' {
  if (state === 'available') return 'green';
  if (state === 'lost' || state === 'damaged') return 'red';
  if (state === 'repair') return 'amber';
  if (state === 'on_loan') return 'blue';
  return 'slate';
}

export function LibraryCopiesTable({
  rows,
  canCirculation,
  pendingAction,
  onEdit,
  onCheckout,
  onLifecycle,
}: {
  rows: LibraryCopyRow[];
  canCirculation: boolean;
  pendingAction?: string | null;
  onEdit: (copy: LibraryCopyRow) => void;
  onCheckout: (copy: LibraryCopyRow) => void;
  onLifecycle: (copy: LibraryCopyRow, action: LibraryCopyAction) => void;
}) {
  const columns: Column<LibraryCopyRow>[] = [
    {
      key: 'book',
      header: 'الكتاب',
      render: (row) => (
        <div className="library-identity">
          <span className="library-identity__title" dir="auto">{row.title.name}</span>
          <span className="library-identity__meta">الرف: <span dir="auto">{row.shelf || 'غير محدد'}</span></span>
        </div>
      ),
    },
    {
      key: 'copy',
      header: 'النسخة',
      render: (row) => (
        <div className="library-code-stack">
          <bdi className="mono" dir="auto">{row.accession}</bdi>
          <span className="tiny muted">{row.barcode ? <bdi dir="ltr">{row.barcode}</bdi> : 'بدون باركود'}</span>
        </div>
      ),
    },
    {
      key: 'state',
      header: 'الحالة',
      render: (row) => (
        <div className="library-code-stack">
          <Badge tone={stateTone(row.state)}>{libraryStateLabel[row.state] || row.state}</Badge>
          <span className="tiny muted">فيزيائيًا: {row.condition ? libraryConditionLabel[row.condition] : 'غير محددة'}</span>
        </div>
      ),
    },
    {
      key: 'policy',
      header: 'الإعارة',
      render: (row) => row.circulation_policy === 'loanable'
        ? <Badge tone="green">قابلة للإعارة</Badge>
        : <Badge tone="slate">داخل المكتبة</Badge>,
    },
    {
      key: 'actions',
      header: '',
      label: 'الإجراءات',
      render: (row) => {
        const allowedLifecycle = lifecycleActions.filter((action) => libraryActionAllowed(row.allowed_actions, action));
        const canEdit = libraryActionAllowed(row.allowed_actions, 'edit');
        const rowBusy = Boolean(pendingAction?.startsWith(`copy:${row.id}:`));
        return (
          <div className="library-actions">
            {canCirculation && libraryActionAllowed(row.allowed_actions, 'checkout') ? (
              <button type="button" disabled={rowBusy} className="btn btn--primary btn--sm" onClick={() => onCheckout(row)}>إعارة</button>
            ) : null}
            {canEdit ? <button type="button" disabled={rowBusy} className="btn btn--ghost btn--sm" onClick={() => onEdit(row)}>تعديل</button> : null}
            {allowedLifecycle.length ? (
              <details className="library-actions-menu">
                <summary className="btn btn--ghost btn--sm">إجراءات</summary>
                <div className="library-actions-menu__panel">
                  {allowedLifecycle.map((action) => {
                    const actionKey = `copy:${row.id}:${action}`;
                    const actionBusy = pendingAction === actionKey;
                    return (
                      <button
                        key={action}
                        type="button"
                        disabled={rowBusy}
                        className={action === 'withdraw' || action === 'mark_lost' ? 'library-action--danger' : undefined}
                        onClick={() => onLifecycle(row, action)}
                      >
                        {actionBusy ? 'جارٍ التنفيذ…' : libraryCopyActionLabel[action]}
                      </button>
                    );
                  })}
                </div>
              </details>
            ) : null}
          </div>
        );
      },
    },
  ];

  return <div className="library-table"><DataTable columns={columns} rows={rows} rowKey={(row) => row.id} /></div>;
}
