'use client';

import type { LibraryTitleRow } from './library-contract';

export function LibraryCatalogTable({ rows }: { rows: LibraryTitleRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900">
          <tr>
            {['العنوان', 'المؤلف', 'الناشر', 'ISBN', 'السياسة', 'النسخ', 'المتاح'].map((label) => (
              <th key={label} className="px-4 py-3 text-right font-medium">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3">{row.authors || '—'}</td>
              <td className="px-4 py-3">{row.publisher || '—'}</td>
              <td className="px-4 py-3">{row.isbn || '—'}</td>
              <td className="px-4 py-3">
                {row.default_circulation_policy === 'loanable' ? 'قابلة للإعارة' : 'داخل المكتبة فقط'}
              </td>
              <td className="px-4 py-3">{row.copy_count}</td>
              <td className="px-4 py-3">{row.available_copy_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
