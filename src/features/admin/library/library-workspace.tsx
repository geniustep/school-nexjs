'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/features/auth/session-context';
import { api } from '@/lib/api/client';
import { hasPermission } from '@/lib/permissions/permissions';
import { LibraryCatalogTable } from './catalog-table';
import { LibraryCirculationCreateForm, type LibraryCheckoutValues } from './circulation-create-form';
import { LibraryCirculationsTable } from './circulations-table';
import { LibraryCopiesTable } from './copies-table';
import {
  archiveLibraryTitle,
  checkoutLibraryStudent,
  createLibraryCopy,
  createLibraryTitle,
  returnLibraryLoan,
  runLibraryCopyAction,
  updateLibraryTitle,
} from './library-actions';
import {
  libraryCopyActionLabel,
  libraryEndpoints,
  libraryErrorMessage,
  libraryResponseTotal,
  type LibraryCirculationFilter,
  type LibraryCirculationRow,
  type LibraryCopyAction,
  type LibraryCopyRow,
  type LibraryTab,
  type LibraryTitleRow,
} from './library-contract';
import { PhysicalCopyForm, type PhysicalCopyFormValues } from './physical-copy-form';
import { LibraryReturnForm, type LibraryReturnValues } from './return-form';
import { LibraryTitleForm, type LibraryTitleFormValues } from './title-form';
import { libraryInputClass, libraryPrimaryButton } from './library-ui';

export function LibraryWorkspace() {
  const user = useSession();
  const canCatalog = hasPermission(user, 'library.catalog.manage');
  const canCirculation = hasPermission(user, 'library.circulation.manage');

  const [tab, setTab] = useState<LibraryTab>('catalog');
  const [circulationFilter, setCirculationFilter] = useState<LibraryCirculationFilter>('checked_out');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [total, setTotal] = useState(0);
  const [titles, setTitles] = useState<LibraryTitleRow[]>([]);
  const [copies, setCopies] = useState<LibraryCopyRow[]>([]);
  const [loans, setLoans] = useState<LibraryCirculationRow[]>([]);

  const [titleForm, setTitleForm] = useState<'new' | LibraryTitleRow | null>(null);
  const [copyFormOpen, setCopyFormOpen] = useState(false);
  const [copyFormTitles, setCopyFormTitles] = useState<LibraryTitleRow[]>([]);
  const [openingCopyForm, setOpeningCopyForm] = useState(false);
  const [checkoutCopy, setCheckoutCopy] = useState<LibraryCopyRow | null>(null);
  const [returnLoan, setReturnLoan] = useState<LibraryCirculationRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const common = { page: 1, page_size: 50, search: query || undefined };
    if (tab === 'catalog') {
      const result = await api.get<LibraryTitleRow[]>(libraryEndpoints.titles, { ...common, active: 1 });
      if (!result.success) { setTitles([]); setTotal(0); setError(libraryErrorMessage(result)); }
      else { setTitles(result.data); setTotal(libraryResponseTotal(result, result.data.length)); }
    } else if (tab === 'copies') {
      const result = await api.get<LibraryCopyRow[]>(libraryEndpoints.copies, { ...common, active: 1 });
      if (!result.success) { setCopies([]); setTotal(0); setError(libraryErrorMessage(result)); }
      else { setCopies(result.data); setTotal(libraryResponseTotal(result, result.data.length)); }
    } else {
      const circulationQuery = circulationFilter === 'overdue'
        ? { ...common, overdue: 1 }
        : { ...common, state: circulationFilter };
      const result = await api.get<LibraryCirculationRow[]>(libraryEndpoints.circulations, circulationQuery);
      if (!result.success) { setLoans([]); setTotal(0); setError(libraryErrorMessage(result)); }
      else { setLoans(result.data); setTotal(libraryResponseTotal(result, result.data.length)); }
    }
    setLoading(false);
  }, [circulationFilter, query, tab]);

  useEffect(() => { void load(); }, [load]);

  function showMutationError<T>(result: Awaited<ReturnType<typeof api.post<T>>>): boolean {
    if (result.success) return false;
    setNotice('');
    setError(libraryErrorMessage(result));
    return true;
  }

  async function submitTitle(values: LibraryTitleFormValues) {
    const result = titleForm === 'new'
      ? await createLibraryTitle(values)
      : titleForm
        ? await updateLibraryTitle(titleForm.id, values)
        : null;
    if (!result || showMutationError(result)) return;
    setTitleForm(null);
    setNotice(titleForm === 'new' ? 'تمت إضافة العنوان.' : 'تم حفظ تعديلات العنوان.');
    await load();
  }

  async function archiveTitle(row: LibraryTitleRow) {
    if (!window.confirm(`أرشفة «${row.name}»؟`)) return;
    const result = await archiveLibraryTitle(row.id);
    if (showMutationError(result)) return;
    setNotice('تمت أرشفة العنوان.');
    await load();
  }

  async function openCopyForm() {
    setOpeningCopyForm(true);
    setError('');
    const result = await api.get<LibraryTitleRow[]>(libraryEndpoints.titles, { page: 1, page_size: 200, active: 1 });
    setOpeningCopyForm(false);
    if (!result.success) {
      setCopyFormTitles([]);
      setError(libraryErrorMessage(result));
      return;
    }
    setCopyFormTitles(result.data);
    setCopyFormOpen(true);
  }

  async function submitCopy(values: PhysicalCopyFormValues) {
    const result = await createLibraryCopy(values);
    if (showMutationError(result)) return;
    setCopyFormOpen(false);
    setNotice('تمت إضافة النسخة المادية.');
    await load();
  }

  async function runCopyLifecycle(copy: LibraryCopyRow, action: LibraryCopyAction) {
    if (!window.confirm(`${libraryCopyActionLabel[action]} للنسخة ${copy.accession}؟`)) return;
    const result = await runLibraryCopyAction(copy.id, action);
    if (showMutationError(result)) return;
    setNotice('تم تحديث حالة النسخة.');
    await load();
  }

  async function submitCheckout(values: LibraryCheckoutValues) {
    if (!checkoutCopy) return;
    const result = await checkoutLibraryStudent(checkoutCopy.id, values);
    if (showMutationError(result)) return;
    setCheckoutCopy(null);
    setNotice('تمت إعارة النسخة بنجاح.');
    await load();
  }

  async function submitReturn(values: LibraryReturnValues) {
    if (!returnLoan) return;
    const result = await returnLibraryLoan(returnLoan.id, values);
    if (showMutationError(result)) return;
    setReturnLoan(null);
    setNotice('تم استرجاع النسخة بنجاح.');
    await load();
  }

  const primaryAction = tab === 'catalog' && canCatalog ? (
    <button type="button" className={libraryPrimaryButton} onClick={() => setTitleForm('new')}>إضافة عنوان</button>
  ) : tab === 'copies' && canCatalog ? (
    <button type="button" disabled={openingCopyForm} className={libraryPrimaryButton} onClick={() => void openCopyForm()}>{openingCopyForm ? 'جارٍ التحضير…' : 'إضافة نسخة'}</button>
  ) : null;

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">المكتبة</h1><p className="mt-1 text-sm text-slate-500">الفهرس والنسخ المادية والإعارات الحالية داخل المدرسة.</p></div>
        {primaryAction}
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {([['catalog','الفهرس'],['copies','النسخ'],['circulation','الإعارات']] as const).map(([key,label]) => <button key={key} type="button" onClick={() => { setTab(key); setQuery(''); }} className={`rounded-lg px-3 py-2 text-sm ${tab === key ? 'bg-white font-medium shadow-sm dark:bg-slate-950' : 'text-slate-500'}`}>{label}</button>)}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input className={`${libraryInputClass} min-w-56 flex-1`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث" />
        {tab === 'circulation' ? (
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={circulationFilter} onChange={(event) => setCirculationFilter(event.target.value as LibraryCirculationFilter)}>
            <option value="checked_out">النشطة</option>
            <option value="overdue">المتأخرة</option>
            <option value="returned">المُعادة</option>
          </select>
        ) : null}
        <span className="whitespace-nowrap text-sm text-slate-500">{total} نتيجة</span>
      </div>

      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="py-16 text-center text-slate-500">جارٍ التحميل…</div>
      ) : tab === 'catalog' ? (
        <LibraryCatalogTable rows={titles} onEdit={(row) => setTitleForm(row)} onArchive={(row) => void archiveTitle(row)} />
      ) : tab === 'copies' ? (
        <LibraryCopiesTable rows={copies} canCirculation={canCirculation} onCheckout={setCheckoutCopy} onLifecycle={(copy, action) => void runCopyLifecycle(copy, action)} />
      ) : (
        <LibraryCirculationsTable rows={loans} canAct={canCirculation} onAction={setReturnLoan} />
      )}

      {!loading && !error && total === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500 dark:border-slate-700">لا توجد بيانات مطابقة حاليًا.</div> : null}

      {titleForm ? <LibraryTitleForm initial={titleForm === 'new' ? null : titleForm} onClose={() => setTitleForm(null)} onSubmit={submitTitle} /> : null}
      {copyFormOpen ? <PhysicalCopyForm titles={copyFormTitles} loadError="" onClose={() => setCopyFormOpen(false)} onSubmit={submitCopy} /> : null}
      {checkoutCopy ? <LibraryCirculationCreateForm copy={checkoutCopy} onClose={() => setCheckoutCopy(null)} onSubmit={submitCheckout} /> : null}
      {returnLoan ? <LibraryReturnForm loan={returnLoan} onClose={() => setReturnLoan(null)} onSubmit={submitReturn} /> : null}
    </div>
  );
}
