'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api/client';
import { libraryEndpoints } from '@/lib/api/library-endpoints';
import { libraryCoverBffUrl, libraryRequestStateLabel, type LibraryCategory, type LibraryRequest, type SelfLibraryLoan, type SelfLibraryTitle } from '@/features/library/library-product-contract';
import styles from '@/features/library/product-workspaces.module.css';

type Tab = 'catalog' | 'requests' | 'loans';

export function StudentLibraryWorkspace() {
  const [tab, setTab] = useState<Tab>('catalog');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [titles, setTitles] = useState<SelfLibraryTitle[]>([]);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [requests, setRequests] = useState<LibraryRequest[]>([]);
  const [loans, setLoans] = useState<SelfLibraryLoan[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    if (tab === 'catalog') {
      const [books, cats] = await Promise.all([
        api.get<SelfLibraryTitle[]>(libraryEndpoints.student.titles, { page: 1, page_size: 80, search: query || undefined, category_id: categoryId || undefined }),
        api.get<LibraryCategory[]>(libraryEndpoints.student.categories),
      ]);
      if (!books.success) setError(books.error.message);
      else setTitles(books.data);
      if (cats.success) setCategories(cats.data);
    } else if (tab === 'requests') {
      const result = await api.get<LibraryRequest[]>(libraryEndpoints.student.requests, { page: 1, page_size: 80 });
      if (!result.success) setError(result.error.message); else setRequests(result.data);
    } else {
      const result = await api.get<SelfLibraryLoan[]>(libraryEndpoints.student.loans, { page: 1, page_size: 80 });
      if (!result.success) setError(result.error.message); else setLoans(result.data);
    }
  }, [categoryId, query, tab]);

  useEffect(() => { void load(); }, [load]);

  async function requestBook(title: SelfLibraryTitle) {
    if (!title.request_allowed || busy) return;
    setBusy(title.id); setError(''); setNotice('');
    const result = await api.post<LibraryRequest>(libraryEndpoints.student.requests, { title_id: title.id });
    setBusy(null);
    if (!result.success) setError(result.error.message);
    else { setNotice('تم إرسال طلب الكتاب إلى المكتبة.'); await load(); }
  }

  async function cancelRequest(row: LibraryRequest) {
    setBusy(row.id); setError('');
    const result = await api.post<LibraryRequest>(libraryEndpoints.student.cancelRequest(row.id), {});
    setBusy(null);
    if (!result.success) setError(result.error.message); else await load();
  }

  return <div className={styles.workspace}>
    <PageHeader title="المكتبة" subtitle="ابحث عن الكتب واطلبها وتابع إعاراتك من مكان واحد." />
    <div className={styles.tabs}>
      {([['catalog','الكتب'],['requests','طلباتي'],['loans','إعاراتي']] as const).map(([key,label]) => <button key={key} className={styles.tab} data-active={tab===key} onClick={() => setTab(key)}>{label}</button>)}
    </div>
    {notice ? <div className={`${styles.notice} ${styles.success}`}>{notice}</div> : null}
    {error ? <div className={`${styles.notice} ${styles.error}`}>{error}</div> : null}

    {tab === 'catalog' ? <>
      <div className={styles.toolbar}>
        <input className={`input ${styles.search}`} placeholder="ابحث باسم الكتاب أو المؤلف أو ISBN" value={query} onChange={(e)=>setQuery(e.target.value)} />
        <select className="select" value={categoryId} onChange={(e)=>setCategoryId(e.target.value)}>
          <option value="">كل التصنيفات</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {titles.length ? <div className={styles.grid}>{titles.map(title => {
        const cover = libraryCoverBffUrl(title.cover?.url);
        return <article key={title.id} className={styles.card}>
          <div className={styles.book}>
            {cover ? <img className={styles.cover} src={cover} alt="" /> : <div className={styles.cover} aria-hidden="true" />}
            <div className={styles.bookBody}><strong>{title.name}</strong>{title.authors ? <span className={styles.muted}>{title.authors}</span> : null}<span className={styles.tiny}>{title.category?.name ?? 'غير مصنف'}</span>{title.isbn ? <span className={styles.tiny}>ISBN: <bdi>{title.isbn}</bdi></span> : null}</div>
          </div>
          <div className={styles.mobileStack}><span className={styles.badge}>{title.available_copy_count > 0 ? `${title.available_copy_count} متاح` : 'غير متاح الآن'}</span>{title.request_allowed ? <button className="btn btn--primary btn--sm" disabled={busy===title.id} onClick={()=>void requestBook(title)}>{busy===title.id?'جارٍ الطلب…':'طلب الكتاب'}</button> : null}</div>
        </article>;
      })}</div> : <div className={styles.empty}>لا توجد كتب مطابقة.</div>}
    </> : null}

    {tab === 'requests' ? <div className={styles.list}>{requests.length ? requests.map(row => <div key={row.id} className={styles.row}><div className={styles.rowMain}><strong>{row.title?.name ?? 'كتاب'}</strong><span className={styles.muted}>{libraryRequestStateLabel(row.state)}</span>{row.state==='ready'?<span className={styles.badge}>جاهز للاستلام من المكتبة</span>:null}</div>{row.allowed_actions?.cancel ? <button className="btn btn--ghost btn--sm" disabled={busy===row.id} onClick={()=>void cancelRequest(row)}>إلغاء الطلب</button>:null}</div>) : <div className={styles.empty}>لا توجد طلبات بعد.</div>}</div> : null}

    {tab === 'loans' ? <div className={styles.list}>{loans.length ? loans.map(row => <div key={row.id} className={styles.row}><div className={styles.rowMain}><strong>{row.title?.name ?? 'كتاب'}</strong><span className={styles.muted}>رقم الجرد: <bdi>{row.copy?.accession ?? '—'}</bdi></span><span className={row.overdue ? styles.badge : styles.muted}>{row.returned_at ? 'تم الإرجاع' : row.overdue ? 'متأخر' : `موعد الإرجاع: ${row.due_at ? new Date(row.due_at).toLocaleDateString('ar-MA') : '—'}`}</span></div></div>) : <div className={styles.empty}>لا توجد إعارات.</div>}</div> : null}
  </div>;
}
