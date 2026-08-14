'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { LibraryCopyEditForm, type LibraryCopyEditValues } from './copy-edit-form';
import {
  archiveLibraryTitle,
  checkoutLibraryStudent,
  createLibraryCopy,
  createLibraryTitle,
  returnLibraryLoan,
  runLibraryCopyAction,
  updateLibraryCopy,
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
import {
  buildLibraryViewSearch,
  parseLibraryViewSearch,
  type CatalogPolicyFilter,
  type CopyStateFilter,
} from './library-view-state';
import { PhysicalCopyForm, type PhysicalCopyFormValues } from './physical-copy-form';
import { LibraryQuickCopyLookup } from './quick-copy-lookup';
import { LibraryReturnForm, type LibraryReturnValues } from './return-form';
import { LibraryTitleCopyCheckout } from './title-copy-checkout';
import { LibraryTitleForm, type LibraryTitleFormValues } from './title-form';
import './library.css';

const PAGE_SIZE = 50;

type LibraryMetrics = {
  titles: number | null;
  available: number | null;
  onLoan: number | null;
  overdue: number | null;
};

type HistoryMode = 'push' | 'replace' | 'skip';

const tabs: Array<{ key: LibraryTab; label: string }> = [
  { key: 'catalog', label: 'الفهرس' },
  { key: 'copies', label: 'النسخ المادية' },
  { key: 'circulation', label: 'الإعارات' },
];

const initialMetrics: LibraryMetrics = { titles: null, available: null, onLoan: null, overdue: null };

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
  const [urlReady, setUrlReady] = useState(false);
  const historyModeRef = useRef<HistoryMode>('skip');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [total, setTotal] = useState(0);
  const [titles, setTitles] = useState<LibraryTitleRow[]>([]);
  const [copies, setCopies] = useState<LibraryCopyRow[]>([]);
  const [loans, setLoans] = useState<LibraryCirculationRow[]>([]);
  const [metrics, setMetrics] = useState<LibraryMetrics>(initialMetrics);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const [titleForm, setTitleForm] = useState<'new' | LibraryTitleRow | null>(null);
  const [copyFormOpen, setCopyFormOpen] = useState(false);
  const [copyFormTitles, setCopyFormTitles] = useState<LibraryTitleRow[]>([]);
  const [openingCopyForm, setOpeningCopyForm] = useState(false);
  const [editCopy, setEditCopy] = useState<LibraryCopyRow | null>(null);
  const [quickLookupOpen, setQuickLookupOpen] = useState(false);
  const [quickCheckoutFlow, setQuickCheckoutFlow] = useState(false);
  const [checkoutTitle, setCheckoutTitle] = useState<LibraryTitleRow | null>(null);
  const [checkoutCopy, setCheckoutCopy] = useState<LibraryCopyRow | null>(null);
  const [returnLoan, setReturnLoan] = useState<LibraryCirculationRow | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentRowsCount = tab === 'catalog' ? titles.length : tab === 'copies' ? copies.length : loans.length;
  const initialLoading = loading && currentRowsCount === 0;
  const refetching = loading && currentRowsCount > 0;
  const hasActiveFilters = Boolean(query.trim()) || (tab === 'catalog' && Boolean(catalogPolicy)) || (tab === 'copies' && Boolean(copyState)) || (tab === 'circulation' && circulationFilter !== 'checked_out');

  const applyLocationState = useCallback(() => {
    const next = parseLibraryViewSearch(window.location.search);
    historyModeRef.current = 'skip';
    setTab(next.tab);
    setCirculationFilter(next.circulationFilter);
    setCatalogPolicy(next.catalogPolicy);
    setCopyState(next.copyState);
    setQuery(next.query);
    setPage(next.page);
    setUrlReady(true);
  }, []);

  useEffect(() => {
    applyLocationState();
    const onPopState = () => applyLocationState();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyLocationState]);

  useEffect(() => {
    if (!urlReady) return;
    const search = buildLibraryViewSearch({ tab, circulationFilter, catalogPolicy, copyState, query, page });
    const target = `${window.location.pathname}${search ? `?${search}` : ''}`;
    const current = `${window.location.pathname}${window.location.search}`;
    const mode = historyModeRef.current;
    if (mode === 'skip') {
      historyModeRef.current = 'replace';
      return;
    }
    if (target !== current) {
      if (mode === 'push') window.history.pushState(null, '', target);
      else window.history.replaceState(null, '', target);
    }
    historyModeRef.current = 'replace';
  }, [catalogPolicy, circulationFilter, copyState, page, query, tab, urlReady]);

  function markHistoryPush() {
    if (urlReady) historyModeRef.current = 'push';
  }

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
      if (!result.success) setError(libraryErrorMessage(result));
      else { setTitles(result.data); setTotal(libraryResponseTotal(result, result.data.length)); }
    } else if (tab === 'copies') {
      const result = await api.get<LibraryCopyRow[]>(libraryEndpoints.copies, {
        ...common,
        active: 1,
        state: copyState || undefined,
      });
      if (!result.success) setError(libraryErrorMessage(result));
      else { setCopies(result.data); setTotal(libraryResponseTotal(result, result.data.length)); }
    } else {
      const circulationQuery = circulationFilter === 'overdue'
        ? { ...common, overdue: 1 }
        : { ...common, state: circulationFilter };
      const result = await api.get<LibraryCirculationRow[]>(libraryEndpoints.circulations, circulationQuery);
      if (!result.success) setError(libraryErrorMessage(result));
      else { setLoans(result.data); setTotal(libraryResponseTotal(result, result.data.length)); }
    }
    setLoading(false);
  }, [catalogPolicy, circulationFilter, copyState, page, query, tab]);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    const [titleResult, availableResult, onLoanResult, overdueResult] = await Promise.all([
      api.get<LibraryTitleRow[]>(libraryEndpoints.titles, { page: 1, page_size: 1, active: 1 }),
      api.get<LibraryCopyRow[]>(libraryEndpoints.copies, { page: 1, page_size: 1, active: 1, state: 'available' }),
      api.get<LibraryCopyRow[]>(libraryEndpoints.copies, { page: 1, page_size: 1, active: 1, state: 'on_loan' }),
      api.get<LibraryCirculationRow[]>(libraryEndpoints.circulations, { page: 1, page_size: 1, overdue: 1 }),
    ]);
    setMetrics((current) => ({
      titles: titleResult.success ? libraryResponseTotal(titleResult, titleResult.data.length) : current.titles,
      available: availableResult.success ? libraryResponseTotal(availableResult, availableResult.data.length) : current.available,
      onLoan: onLoanResult.success ? libraryResponseTotal(onLoanResult, onLoanResult.data.length) : current.onLoan,
      overdue: overdueResult.success ? libraryResponseTotal(overdueResult, overdueResult.data.length) : current.overdue,
    }));
    setMetricsLoading(false);
  }, []);

  useEffect(() => { if (urlReady) void load(); }, [load, urlReady]);
  useEffect(() => { void loadMetrics(); }, [loadMetrics]);

  useEffect(() => {
    if (!loading && total > 0 && page > totalPages) {
      historyModeRef.current = 'replace';
      setPage(totalPages);
    }
  }, [loading, page, total, totalPages]);

  async function refreshAll() {
    await Promise.all([load(), loadMetrics()]);
  }

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
    await refreshAll();
  }

  async function archiveTitle(row: LibraryTitleRow) {
    if (pendingAction) return;
    if (!window.confirm(`أرشفة «${row.name}»؟`)) return;
    const actionKey = `title:${row.id}:archive`;
    setPendingAction(actionKey);
    try {
      const result = await archiveLibraryTitle(row.id);
      if (showMutationError(result)) return;
      setNotice('تمت أرشفة العنوان.');
      await refreshAll();
    } finally {
      setPendingAction(null);
    }
  }

  async function openCopyForm() {
    if (openingCopyForm) return;
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
    await refreshAll();
  }

  async function submitCopyEdit(values: LibraryCopyEditValues) {
    if (!editCopy) return;
    const result = await updateLibraryCopy(editCopy.id, values);
    if (showMutationError(result)) return;
    setEditCopy(null);
    setNotice('تم حفظ تعديلات النسخة.');
    await refreshAll();
  }

  async function runCopyLifecycle(copy: LibraryCopyRow, action: LibraryCopyAction) {
    if (pendingAction) return;
    if (!window.confirm(`${libraryCopyActionLabel[action]} للنسخة ${copy.accession}؟`)) return;
    const actionKey = `copy:${copy.id}:${action}`;
    setPendingAction(actionKey);
    try {
      const result = await runLibraryCopyAction(copy.id, action);
      if (showMutationError(result)) return;
      setNotice('تم تحديث حالة النسخة.');
      await refreshAll();
    } finally {
      setPendingAction(null);
    }
  }

  async function submitCheckout(values: LibraryCheckoutValues) {
    if (!checkoutCopy) return;
    const continueQuick = quickCheckoutFlow;
    const result = await checkoutLibraryStudent(checkoutCopy.id, values);
    if (showMutationError(result)) return;
    setCheckoutCopy(null);
    setQuickCheckoutFlow(false);
    setNotice(continueQuick ? 'تمت الإعارة. امسح النسخة التالية.' : 'تمت إعارة النسخة بنجاح.');
    if (continueQuick) setQuickLookupOpen(true);
    await refreshAll();
  }

  async function submitReturn(values: LibraryReturnValues) {
    if (!returnLoan) return;
    const result = await returnLibraryLoan(returnLoan.id, values);
    if (showMutationError(result)) return;
    setReturnLoan(null);
    setNotice('تم استرجاع النسخة بنجاح.');
    await refreshAll();
  }

  function resetFilters() {
    markHistoryPush();
    setQuery('');
    setCatalogPolicy('');
    setCopyState('');
    setCirculationFilter('checked_out');
    setPage(1);
  }

  function selectTab(nextTab: LibraryTab) {
    markHistoryPush();
    setTab(nextTab);
    setQuery('');
    setPage(1);
    setNotice('');
    setError('');
  }

  function selectMetric(metric: 'titles' | 'available' | 'onLoan' | 'overdue') {
    markHistoryPush();
    setQuery('');
    setPage(1);
    setNotice('');
    setError('');
    if (metric === 'titles') {
      setTab('catalog');
      setCatalogPolicy('');
    } else if (metric === 'available') {
      setTab('copies');
      setCopyState('available');
    } else if (metric === 'onLoan') {
      setTab('copies');
      setCopyState('on_loan');
    } else {
      setTab('circulation');
      setCirculationFilter('overdue');
    }
  }

  function selectQuickCheckoutCopy(copy: LibraryCopyRow) {
    setQuickLookupOpen(false);
    setQuickCheckoutFlow(true);
    setCheckoutCopy(copy);
  }

  function selectRegularCheckoutCopy(copy: LibraryCopyRow) {
    setQuickCheckoutFlow(false);
    setCheckoutCopy(copy);
  }

  const selectTitleCheckoutCopy = useCallback((copy: LibraryCopyRow) => {
    setCheckoutTitle(null);
    setQuickCheckoutFlow(false);
    setCheckoutCopy(copy);
  }, []);

  const contextAction = tab === 'catalog' && canCatalog ? (
    <button type="button" className="btn btn--primary btn--sm" onClick={() => setTitleForm('new')}>إضافة عنوان</button>
  ) : tab === 'copies' && canCatalog ? (
    <button type="button" disabled={openingCopyForm} className="btn btn--primary btn--sm" onClick={() => void openCopyForm()}>{openingCopyForm ? 'جارٍ التحضير…' : 'إضافة نسخة'}</button>
  ) : null;

  const headerActions = canCirculation || contextAction ? (
    <div className="library-workspace__header-actions">
      {canCirculation ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => setQuickLookupOpen(true)}>إعارة سريعة</button> : null}
      {contextAction}
    </div>
  ) : undefined;

  const searchPlaceholder = tab === 'catalog'
    ? 'ابحث عن عنوان، مؤلف أو ISBN'
    : tab === 'copies'
      ? 'ابحث برقم الجرد، الباركود أو الكتاب'
      : 'ابحث عن كتاب أو مستعير';

  const emptyTitle = hasActiveFilters
    ? 'لا توجد نتائج مطابقة'
    : tab === 'catalog'
      ? 'لا توجد عناوين في المكتبة بعد'
      : tab === 'copies'
        ? 'لا توجد نسخ مادية بعد'
        : circulationFilter === 'overdue'
          ? 'لا توجد إعارات متأخرة'
          : circulationFilter === 'returned'
            ? 'لا توجد إعارات مُعادة في هذه النتائج'
            : 'لا توجد إعارات نشطة';

  const emptyDescription = hasActiveFilters
    ? 'غيّر البحث أو الفلاتر لعرض نتائج أخرى.'
    : circulationFilter === 'overdue' && tab === 'circulation'
      ? 'جميع الإعارات الحالية ضمن مواعيدها.'
      : tab === 'catalog'
        ? 'ابدأ بإضافة أول عنوان ثم أضف نسخه المادية.'
        : tab === 'copies'
          ? 'أضف نسخة مرتبطة بعنوان موجود في الفهرس.'
          : undefined;

  const emptyAction = hasActiveFilters ? (
    <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>مسح الفلاتر</button>
  ) : tab === 'catalog' && canCatalog ? (
    <button type="button" className="btn btn--primary btn--sm" onClick={() => setTitleForm('new')}>إضافة أول عنوان</button>
  ) : tab === 'copies' && canCatalog ? (
    <button type="button" className="btn btn--primary btn--sm" disabled={openingCopyForm} onClick={() => void openCopyForm()}>إضافة نسخة</button>
  ) : undefined;

  return (
    <div className="admin-workspace library-workspace">
      <PageHeader
        title="المكتبة"
        subtitle="إدارة الكتب والنسخ والإعارات."
        actions={headerActions}
      />

      <div className="library-metrics" aria-label="ملخص المكتبة">
        <button type="button" className="library-metric" onClick={() => selectMetric('titles')}>
          <span className="library-metric__label">العناوين</span>
          <strong>{metrics.titles ?? (metricsLoading ? '…' : '—')}</strong>
          <span className="library-metric__hint">فتح الفهرس</span>
        </button>
        <button type="button" className="library-metric" onClick={() => selectMetric('available')}>
          <span className="library-metric__label">النسخ المتاحة</span>
          <strong>{metrics.available ?? (metricsLoading ? '…' : '—')}</strong>
          <span className="library-metric__hint">عرض المتاحة</span>
        </button>
        <button type="button" className="library-metric" onClick={() => selectMetric('onLoan')}>
          <span className="library-metric__label">المعارة</span>
          <strong>{metrics.onLoan ?? (metricsLoading ? '…' : '—')}</strong>
          <span className="library-metric__hint">عرض المعارة</span>
        </button>
        <button type="button" className="library-metric library-metric--attention" onClick={() => selectMetric('overdue')}>
          <span className="library-metric__label">المتأخرة</span>
          <strong>{metrics.overdue ?? (metricsLoading ? '…' : '—')}</strong>
          <span className="library-metric__hint">فتح المتأخرات</span>
        </button>
      </div>

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
            onChange={(event) => { historyModeRef.current = 'replace'; setQuery(event.target.value); setPage(1); }}
            placeholder={searchPlaceholder}
            aria-label="بحث"
          />
        </div>
        {tab === 'catalog' ? (
          <select className="select library-toolbar__select" aria-label="سياسة الإعارة" value={catalogPolicy} onChange={(event) => { markHistoryPush(); setCatalogPolicy(event.target.value as CatalogPolicyFilter); setPage(1); }}>
            <option value="">كل سياسات الإعارة</option>
            <option value="loanable">قابلة للإعارة</option>
            <option value="library_only">داخل المكتبة فقط</option>
          </select>
        ) : null}
        {tab === 'copies' ? (
          <select className="select library-toolbar__select" aria-label="حالة النسخة" value={copyState} onChange={(event) => { markHistoryPush(); setCopyState(event.target.value as CopyStateFilter); setPage(1); }}>
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
          <select className="select library-toolbar__select" aria-label="حالة الإعارة" value={circulationFilter} onChange={(event) => { markHistoryPush(); setCirculationFilter(event.target.value as LibraryCirculationFilter); setPage(1); }}>
            <option value="checked_out">النشطة</option>
            <option value="overdue">المتأخرة</option>
            <option value="returned">المُعادة</option>
          </select>
        ) : null}
        {hasActiveFilters ? <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>مسح الفلاتر</button> : null}
        <span className="library-toolbar__meta"><bdi dir="ltr">{total}</bdi> نتيجة</span>
      </div>

      {notice ? <div className="library-feedback library-feedback--success" role="status">✓ {notice}</div> : null}
      {error ? (
        <div className="library-feedback library-feedback--error" role="alert">
          <span>! {error}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { void load(); void loadMetrics(); }}>إعادة المحاولة</button>
        </div>
      ) : null}
      {refetching ? <p className="library-fetching-hint" aria-live="polite">جارٍ تحديث النتائج…</p> : null}

      {initialLoading ? (
        <LoadingState label="جارٍ تحميل المكتبة…" />
      ) : currentRowsCount === 0 && !error ? (
        <EmptyState
          icon={hasActiveFilters ? '⌕' : '📚'}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <div className={refetching ? 'library-results library-results--fetching' : 'library-results'} aria-busy={refetching || undefined}>
          {tab === 'catalog' ? (
            <LibraryCatalogTable
              rows={titles}
              pendingAction={pendingAction}
              canCirculation={canCirculation}
              onCheckout={setCheckoutTitle}
              onEdit={(row) => setTitleForm(row)}
              onArchive={(row) => void archiveTitle(row)}
            />
          ) : tab === 'copies' ? (
            <LibraryCopiesTable rows={copies} canCirculation={canCirculation} pendingAction={pendingAction} onEdit={setEditCopy} onCheckout={selectRegularCheckoutCopy} onLifecycle={(copy, action) => void runCopyLifecycle(copy, action)} />
          ) : (
            <LibraryCirculationsTable rows={loans} canAct={canCirculation} onAction={setReturnLoan} />
          )}
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPage={(nextPage) => { markHistoryPush(); setPage(nextPage); }} />
        </div>
      )}

      {titleForm ? <LibraryTitleForm initial={titleForm === 'new' ? null : titleForm} onClose={() => setTitleForm(null)} onSubmit={submitTitle} /> : null}
      {copyFormOpen ? <PhysicalCopyForm titles={copyFormTitles} loadError="" onClose={() => setCopyFormOpen(false)} onSubmit={submitCopy} /> : null}
      {editCopy ? <LibraryCopyEditForm copy={editCopy} onClose={() => setEditCopy(null)} onSubmit={submitCopyEdit} /> : null}
      {quickLookupOpen ? <LibraryQuickCopyLookup onClose={() => setQuickLookupOpen(false)} onSelect={selectQuickCheckoutCopy} /> : null}
      {checkoutTitle ? <LibraryTitleCopyCheckout title={checkoutTitle} onClose={() => setCheckoutTitle(null)} onSelect={selectTitleCheckoutCopy} /> : null}
      {checkoutCopy ? <LibraryCirculationCreateForm copy={checkoutCopy} onClose={() => { setCheckoutCopy(null); setQuickCheckoutFlow(false); }} onSubmit={submitCheckout} /> : null}
      {returnLoan ? <LibraryReturnForm loan={returnLoan} onClose={() => setReturnLoan(null)} onSubmit={submitReturn} /> : null}
    </div>
  );
}
