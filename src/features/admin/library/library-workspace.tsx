'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useCallback, useEffect, useState } from 'react';
import { EmptyState, LoadingState } from '@/components/states/states';
import { Pagination } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
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
import './library.css';

const PAGE_SIZE = 50;

type CatalogPolicyFilter = '' | 'loanable' | 'library_only';
type CopyStateFilter = '' | 'available' | 'on_loan' | 'lost' | 'damaged' | 'repair' | 'withdrawn';

const tabs: Array<{ key: LibraryTab; label: string }> = [
  { key: 'catalog', label: 'الفهرس' },
  { key: 'copies', label: 'النسخ المادية' },
  { key: 'circulation', label: 'الإعارات' },
];

export function LibraryWorkspace() {
  const user = useSession();
  const canCatalog = hasPermission(user, 'library.catalog.manage');
  const canCirculation = hasPermission(user, 'library.circulation.manage');

  const [tab, setTab] = useState<LibraryTab>('catalog');
  const [circulationFilter, setCirculationFilter] = useState<LibraryCirculationFilter>('checked_out');
  const [catalogPolicy, setCatalogPolicy] = useState<CatalogPolicyFilter>('');
  const [copyState, setCopyState] = useState<CopyStateFilter>('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentRowsCount = tab === 'catalog' ? titles.length : tab === 'copies' ? copies.length : loans.length;
  const initialLoading = loading && currentRowsCount === 0;
  const refetching = loading && currentRowsCount > 0;
  const hasActiveFilters = Boolean(query.trim()) || (tab === 'catalog' && Boolean(catalogPolicy)) || (tab === 'copies' && Boolean(copyState)) || (tab === 'circulation' && circulationFilter !== 'checked_out');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const common = { page, page_size: PAGE_SIZE, search: query || undefined };
    if (tab === 'catalog') {
      const result = await api.get<LibraryTitleRow[]>(libraryEndpoints.titles, {
        ...common,
        active: 1,
        policy: catalogPolicy || undefined,
      });
      if (!result.success) { setError(libraryErrorMessage(result)); }
      else { setTitles(result.data); setTotal(libraryResponseTotal(result, result.data.length)); }
    } else if (tab === 'copies') {
      const result = await api.get<LibraryCopyRow[]>(libraryEndpoints.copies, {
        ...common,
        active: 1,
        state: copyState || undefined,
      });
      if (!result.success) { setError(libraryErrorMessage(result)); }
      else { setCopies(result.data); setTotal(libraryResponseTotal(result, result.data.length)); }
    } else {
      const circulationQuery = circulationFilter === 'overdue'
        ? { ...common, overdue: 1 }
        : { ...common, state: circulationFilter };
      const result = await api.get<LibraryCirculationRow[]>(libraryEndpoints.circulations, circulationQuery);
      if (!result.success) { setError(libraryErrorMessage(result)); }
      else { setLoans(result.data); setTotal(libraryResponseTotal(result, result.data.length)); }
    }
    setLoading(false);
  }, [catalogPolicy, circulationFilter, copyState, page, query, tab]);

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
    const wasNew = titleForm === 'new';
    setTitleForm(null);
    setNotice(wasNew ? 'تمت إضافة العنوان.' : 'تم حفظ تعديلات العنوان.');
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

  function resetFilters() {
    setQuery('');
    setCatalogPolicy('');
    setCopyState('');
    setCirculationFilter('checked_out');
    setPage(1);
  }

  function selectTab(nextTab: LibraryTab) {
    setTab(nextTab);
    setQuery('');
    setPage(1);
    setNotice('');
    setError('');
  }

  const primaryAction = tab === 'catalog' && canCatalog ? (
    <button type="button" className="btn btn--primary btn--sm" onClick={() => setTitleForm('new')}>إضافة عنوان</button>
  ) : tab === 'copies' && canCatalog ? (
    <button type="button" disabled={openingCopyForm} className="btn btn--primary btn--sm" onClick={() => void openCopyForm()}>{openingCopyForm ? 'جارٍ التحضير…' : 'إضافة نسخة'}</button>
  ) : null;

  const searchPlaceholder = tab === 'catalog'
    ? 'ابحث عن عنوان، مؤلف أو ISBN'
    : tab === 'copies'
      ? 'ابحث برقم الجرد، الباركود أو الكتاب'
      : 'ابحث عن كتاب أو مستعير';

  return (
    <div className="admin-workspace library-workspace">
      <PageHeader
        title="المكتبة"
        subtitle="إدارة الكتب والنسخ والإعارات."
        actions={primaryAction ? <div className="library-workspace__header-actions">{primaryAction}</div> : undefined}
      />

      <div className="library-tabs" role="tablist" aria-label="أقسام المكتبة">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className="library-tabs__item"
            onClick={() => selectTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="library-toolbar">
        <div className="library-toolbar__search">
          <span className="library-toolbar__search-icon" aria-hidden="true">⌕</span>
          <input
            className="input"
            dir="auto"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder={searchPlaceholder}
            aria-label="بحث"
          />
        </div>
        {tab === 'catalog' ? (
          <select className="select library-toolbar__select" aria-label="سياسة الإعارة" value={catalogPolicy} onChange={(event) => { setCatalogPolicy(event.target.value as CatalogPolicyFilter); setPage(1); }}>
            <option value="">كل سياسات الإعارة</option>
            <option value="loanable">قابلة للإعارة</option>
            <option value="library_only">داخل المكتبة فقط</option>
          </select>
        ) : null}
        {tab === 'copies' ? (
          <select className="select library-toolbar__select" aria-label="حالة النسخة" value={copyState} onChange={(event) => { setCopyState(event.target.value as CopyStateFilter); setPage(1); }}>
            <option value="">كل الحالات</option>
            <option value="available">متاحة</option>
            <option value="on_loan">معارة</option>
            <option value="lost">مفقودة</option>
            <option value="damaged">متضررة</option>
            <option value="repair">قيد الإصلاح</option>
            <option value="withdrawn">مسحوبة</option>
          </select>
        ) : null}
        {tab === 'circulation' ? (
          <select className="select library-toolbar__select" aria-label="حالة الإعارة" value={circulationFilter} onChange={(event) => { setCirculationFilter(event.target.value as LibraryCirculationFilter); setPage(1); }}>
            <option value="checked_out">النشطة</option>
            <option value="overdue">المتأخرة</option>
            <option value="returned">المُعادة</option>
          </select>
        ) : null}
        {hasActiveFilters ? <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>مسح الفلاتر</button> : null}
        <span className="library-toolbar__meta"><bdi dir="ltr">{total}</bdi> نتيجة</span>
      </div>

      {notice ? <div className="library-feedback library-feedback--success" role="status">✓ {notice}</div> : null}
      {error ? <div className="library-feedback library-feedback--error" role="alert">! {error}</div> : null}
      {refetching ? <p className="library-fetching-hint" aria-live="polite">جارٍ تحديث النتائج…</p> : null}

      {initialLoading ? (
        <LoadingState label="جارٍ تحميل المكتبة…" />
      ) : currentRowsCount === 0 && !error ? (
        <EmptyState
          icon={hasActiveFilters ? '⌕' : '📚'}
          title={hasActiveFilters ? 'لا توجد نتائج مطابقة' : tab === 'circulation' ? 'لا توجد إعارات في هذه الحالة' : 'لا توجد بيانات في هذا القسم بعد'}
          description={hasActiveFilters ? 'غيّر البحث أو الفلاتر لعرض نتائج أخرى.' : undefined}
          action={hasActiveFilters ? <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>مسح الفلاتر</button> : undefined}
        />
      ) : (
        <div className={refetching ? 'library-results library-results--fetching' : 'library-results'} aria-busy={refetching || undefined}>
          {tab === 'catalog' ? (
            <LibraryCatalogTable rows={titles} onEdit={(row) => setTitleForm(row)} onArchive={(row) => void archiveTitle(row)} />
          ) : tab === 'copies' ? (
            <LibraryCopiesTable rows={copies} canCirculation={canCirculation} onCheckout={setCheckoutCopy} onLifecycle={(copy, action) => void runCopyLifecycle(copy, action)} />
          ) : (
            <LibraryCirculationsTable rows={loans} canAct={canCirculation} onAction={setReturnLoan} />
          )}
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      )}

      {titleForm ? <LibraryTitleForm initial={titleForm === 'new' ? null : titleForm} onClose={() => setTitleForm(null)} onSubmit={submitTitle} /> : null}
      {copyFormOpen ? <PhysicalCopyForm titles={copyFormTitles} loadError="" onClose={() => setCopyFormOpen(false)} onSubmit={submitCopy} /> : null}
      {checkoutCopy ? <LibraryCirculationCreateForm copy={checkoutCopy} onClose={() => setCheckoutCopy(null)} onSubmit={submitCheckout} /> : null}
      {returnLoan ? <LibraryReturnForm loan={returnLoan} onClose={() => setReturnLoan(null)} onSubmit={submitReturn} /> : null}
    </div>
  );
}
