'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { LibraryCatalogTable } from './catalog-table';
import { LibraryCirculationsTable } from './circulations-table';
import { LibraryCopiesTable } from './copies-table';
import {
  libraryEndpoints,
  libraryErrorMessage,
  libraryResponseTotal,
  type LibraryCirculationRow,
  type LibraryCopyRow,
  type LibraryTab,
  type LibraryTitleRow,
} from './library-contract';
import { libraryInputClass } from './library-ui';

export function LibraryWorkspace() {
  const [tab, setTab] = useState<LibraryTab>('catalog');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [titles, setTitles] = useState<LibraryTitleRow[]>([]);
  const [copies, setCopies] = useState<LibraryCopyRow[]>([]);
  const [loans, setLoans] = useState<LibraryCirculationRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const common = { page: 1, page_size: 50, search: query || undefined };
    if (tab === 'catalog') {
      const result = await api.get<LibraryTitleRow[]>(libraryEndpoints.titles, { ...common, active: true });
      if (!result.success) { setTitles([]); setTotal(0); setError(libraryErrorMessage(result)); }
      else { setTitles(result.data); setTotal(libraryResponseTotal(result, result.data.length)); }
    } else if (tab === 'copies') {
      const result = await api.get<LibraryCopyRow[]>(libraryEndpoints.copies, { ...common, active: true });
      if (!result.success) { setCopies([]); setTotal(0); setError(libraryErrorMessage(result)); }
      else { setCopies(result.data); setTotal(libraryResponseTotal(result, result.data.length)); }
    } else {
      const result = await api.get<LibraryCirculationRow[]>(libraryEndpoints.circulations, { ...common, state: 'checked_out' });
      if (!result.success) { setLoans([]); setTotal(0); setError(libraryErrorMessage(result)); }
      else { setLoans(result.data); setTotal(libraryResponseTotal(result, result.data.length)); }
    }
    setLoading(false);
  }, [query, tab]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div><h1 className="text-2xl font-semibold">المكتبة</h1><p className="mt-1 text-sm text-slate-500">الفهرس والنسخ المادية والإعارات الحالية داخل المدرسة.</p></div>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {([['catalog','الفهرس'],['copies','النسخ'],['circulation','الإعارات الحالية']] as const).map(([key,label]) => <button key={key} type="button" onClick={() => { setTab(key); setQuery(''); }} className={`rounded-lg px-3 py-2 text-sm ${tab === key ? 'bg-white font-medium shadow-sm dark:bg-slate-950' : 'text-slate-500'}`}>{label}</button>)}
      </div>
      <div className="flex items-center gap-3"><input className={libraryInputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث" /><span className="whitespace-nowrap text-sm text-slate-500">{total} نتيجة</span></div>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="py-16 text-center text-slate-500">جارٍ التحميل…</div> : tab === 'catalog' ? <LibraryCatalogTable rows={titles} /> : tab === 'copies' ? <LibraryCopiesTable rows={copies} canCirculation={false} onCheckout={() => undefined} /> : <LibraryCirculationsTable rows={loans} canAct={false} onAction={() => undefined} />}
      {!loading && !error && total === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500 dark:border-slate-700">لا توجد بيانات مطابقة حاليًا.</div> : null}
    </div>
  );
}
