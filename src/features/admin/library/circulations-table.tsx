'use client';

import { libraryStateLabel, type LibraryCirculationRow } from './library-contract';
import { librarySecondaryButton } from './library-ui';

export function LibraryCirculationsTable({ rows, canAct, onAction }: { rows: LibraryCirculationRow[]; canAct: boolean; onAction: (loan: LibraryCirculationRow) => void }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900">
          <tr>{['الكتاب', 'النسخة', 'المستعير', 'الإعارة', 'الاستحقاق', 'الحالة', ''].map((label) => <th key={label} className="px-4 py-3 text-right font-medium">{label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3 font-medium">{row.title.name}</td>
              <td className="px-4 py-3">{row.copy.accession}</td>
              <td className="px-4 py-3">{row.patron_name || '—'}</td>
              <td className="px-4 py-3">{row.checked_out_at?.slice(0, 10) || '—'}</td>
              <td className={row.overdue ? 'px-4 py-3 font-medium text-red-600' : 'px-4 py-3'}>{row.due_at?.slice(0, 10) || '—'}</td>
              <td className="px-4 py-3">{row.overdue ? 'متأخرة' : libraryStateLabel[row.state] || row.state}</td>
              <td className="px-4 py-3">{canAct && row.allowed_actions?.return ? <button type="button" className={librarySecondaryButton} onClick={() => onAction(row)}>استرجاع</button> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
