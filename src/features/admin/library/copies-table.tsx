'use client';

import {
  libraryActionAllowed,
  libraryCopyActionLabel,
  libraryStateLabel,
  type LibraryCopyAction,
  type LibraryCopyRow,
} from './library-contract';
import { librarySecondaryButton } from './library-ui';

const lifecycleActions: LibraryCopyAction[] = [
  'mark_lost',
  'mark_damaged',
  'send_to_repair',
  'restore',
  'withdraw',
];

export function LibraryCopiesTable({
  rows,
  canCirculation,
  onCheckout,
  onLifecycle,
}: {
  rows: LibraryCopyRow[];
  canCirculation: boolean;
  onCheckout: (copy: LibraryCopyRow) => void;
  onLifecycle: (copy: LibraryCopyRow, action: LibraryCopyAction) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900">
          <tr>
            {['الكتاب', 'رقم الجرد', 'الباركود', 'الرف', 'الحالة', 'السياسة', ''].map((label) => (
              <th key={label} className="px-4 py-3 text-right font-medium">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const allowedLifecycle = lifecycleActions.filter((action) => libraryActionAllowed(row.allowed_actions, action));
            return (
              <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 font-medium">{row.title.name}</td>
                <td className="px-4 py-3">{row.accession}</td>
                <td className="px-4 py-3">{row.barcode || '—'}</td>
                <td className="px-4 py-3">{row.shelf || '—'}</td>
                <td className="px-4 py-3">{libraryStateLabel[row.state] || row.state}</td>
                <td className="px-4 py-3">{row.circulation_policy === 'loanable' ? 'قابلة للإعارة' : 'داخل المكتبة فقط'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {canCirculation && libraryActionAllowed(row.allowed_actions, 'checkout') ? (
                      <button type="button" className={librarySecondaryButton} onClick={() => onCheckout(row)}>إعارة</button>
                    ) : null}
                    {allowedLifecycle.length ? (
                      <details className="relative">
                        <summary className={`${librarySecondaryButton} cursor-pointer list-none`}>إجراءات</summary>
                        <div className="absolute left-0 z-20 mt-1 min-w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                          {allowedLifecycle.map((action) => (
                            <button key={action} type="button" className="block w-full rounded-lg px-3 py-2 text-right text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => onLifecycle(row, action)}>
                              {libraryCopyActionLabel[action]}
                            </button>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
