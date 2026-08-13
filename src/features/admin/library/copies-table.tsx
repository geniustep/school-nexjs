'use client';

import {
  libraryActionAllowed,
  libraryStateLabel,
  type LibraryCopyRow,
} from './library-contract';
import { librarySecondaryButton } from './library-ui';

export function LibraryCopiesTable({
  rows,
  canCirculation,
  onCheckout,
}: {
  rows: LibraryCopyRow[];
  canCirculation: boolean;
  onCheckout: (copy: LibraryCopyRow) => void;
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
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3 font-medium">{row.title.name}</td>
              <td className="px-4 py-3">{row.accession}</td>
              <td className="px-4 py-3">{row.barcode || '—'}</td>
              <td className="px-4 py-3">{row.shelf || '—'}</td>
              <td className="px-4 py-3">{libraryStateLabel[row.state] || row.state}</td>
              <td className="px-4 py-3">
                {row.circulation_policy === 'loanable' ? 'قابلة للإعارة' : 'داخل المكتبة فقط'}
              </td>
              <td className="px-4 py-3">
                {canCirculation && libraryActionAllowed(row.allowed_actions, 'checkout') ? (
                  <button type="button" className={librarySecondaryButton} onClick={() => onCheckout(row)}>
                    إعارة
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
