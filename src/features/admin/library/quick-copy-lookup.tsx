'use client';

import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { api } from '@/lib/api/client';
import {
  libraryActionAllowed,
  libraryCheckoutBlockedReason,
  libraryEndpoints,
  libraryErrorMessage,
  libraryStateLabel,
  type LibraryCopyRow,
  type LibraryTitleRow,
} from './library-contract';
import { LibraryModal } from './library-ui';

function normalized(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

export function isExactLibraryCopyIdentifierMatch(copy: LibraryCopyRow, query: string): boolean {
  const needle = normalized(query);
  return normalized(copy.accession) === needle || normalized(copy.barcode) === needle;
}

export function mergeUniqueLibraryCopies(...groups: LibraryCopyRow[][]): LibraryCopyRow[] {
  const seen = new Set<number>();
  const rows: LibraryCopyRow[] = [];
  for (const group of groups) {
    for (const copy of group) {
      if (seen.has(copy.id)) continue;
      seen.add(copy.id);
      rows.push(copy);
    }
  }
  return rows;
}

async function searchCopiesForTitles(titles: LibraryTitleRow[]): Promise<LibraryCopyRow[]> {
  const results = await Promise.all(
    titles.slice(0, 8).map((title) => api.get<LibraryCopyRow[]>(libraryEndpoints.copies, {
      page: 1,
      page_size: 20,
      active: 1,
      title_id: title.id,
    })),
  );
  return results.flatMap((result) => result.success && Array.isArray(result.data) ? result.data : []);
}

export function LibraryQuickCopyLookup({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (copy: LibraryCopyRow) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LibraryCopyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading, results, error]);

  async function search(event?: FormEvent) {
    event?.preventDefault();
    const value = query.trim();
    if (!value || loading) return;

    setLoading(true);
    setError('');
    setSearched(true);

    const directResult = await api.get<LibraryCopyRow[]>(libraryEndpoints.copies, {
      page: 1,
      page_size: 20,
      active: 1,
      search: value,
    });

    const directRows = directResult.success && Array.isArray(directResult.data) ? directResult.data : [];
    const exact = directRows.filter((copy) => isExactLibraryCopyIdentifierMatch(copy, value));
    const exactCheckout = exact.filter((copy) => libraryActionAllowed(copy.allowed_actions, 'checkout'));
    if (exactCheckout.length === 1) {
      setLoading(false);
      onSelect(exactCheckout[0]);
      return;
    }
    if (exact.length > 0) {
      setLoading(false);
      setResults(exact);
      return;
    }

    const titleResult = await api.get<LibraryTitleRow[]>(libraryEndpoints.titles, {
      page: 1,
      page_size: 8,
      active: 1,
      search: value,
    });
    const titleRows = titleResult.success && Array.isArray(titleResult.data) ? titleResult.data : [];
    const titleCopies = titleRows.length ? await searchCopiesForTitles(titleRows) : [];
    setLoading(false);

    if (!directResult.success && !titleResult.success) {
      setResults([]);
      setError(libraryErrorMessage(directResult));
      return;
    }

    setResults(mergeUniqueLibraryCopies(directRows, titleCopies));
  }

  return (
    <LibraryModal title="إعارة سريعة" onClose={onClose}>
      <form className="form-stack" onSubmit={search}>
        <div className="field">
          <label htmlFor="library-quick-copy">الباركود، رقم الجرد، اسم الكتاب أو المؤلف</label>
          <div className="library-quick-search">
            <input
              ref={inputRef}
              id="library-quick-copy"
              autoFocus
              className="input"
              dir="auto"
              autoComplete="off"
              enterKeyHint="search"
              placeholder="امسح الباركود أو ابحث بالكتاب أو المؤلف"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" className="btn btn--primary" disabled={loading || !query.trim()}>{loading ? 'جارٍ البحث…' : 'بحث'}</button>
          </div>
        </div>

        <p className="library-form-note">للباركود ورقم الجرد يبقى البحث فوريًا. ويمكنك أيضًا كتابة اسم الكتاب أو اسم المؤلف لعرض النسخ المرتبطة بالعناوين المطابقة.</p>
        {error ? <p className="library-form-error" role="alert">{error}</p> : null}

        {!loading && searched && results.length === 0 && !error ? (
          <div className="state state--compact">
            <div className="state__title">لم نجد نسخة أو كتابًا مطابقًا</div>
            <div className="state__desc">تحقق من الباركود أو رقم الجرد، أو جرّب جزءًا من اسم الكتاب أو المؤلف.</div>
          </div>
        ) : null}

        {results.length > 0 ? (
          <div className="library-lookup-results">
            {results.map((copy) => {
              const canCheckout = libraryActionAllowed(copy.allowed_actions, 'checkout');
              const blockedReason = libraryCheckoutBlockedReason(copy);
              return (
                <div key={copy.id} className="library-lookup-result">
                  <div className="library-lookup-result__body">
                    <strong dir="auto">{copy.title.name}</strong>
                    <span className="library-lookup-result__meta">
                      رقم الجرد <bdi className="mono" dir="auto">{copy.accession}</bdi>
                      {copy.barcode ? <> · باركود <bdi className="mono" dir="ltr">{copy.barcode}</bdi></> : null}
                    </span>
                    <span className="library-lookup-result__meta">{copy.shelf ? <>الرف: <span dir="auto">{copy.shelf}</span></> : 'الرف غير محدد'}</span>
                    {blockedReason ? <span className="library-lookup-result__reason">{blockedReason}</span> : null}
                  </div>
                  <div className="library-lookup-result__action">
                    <Badge tone={copy.state === 'available' ? 'green' : 'slate'}>{libraryStateLabel[copy.state] || copy.state}</Badge>
                    <button type="button" className="btn btn--primary btn--sm" disabled={!canCheckout} onClick={() => onSelect(copy)}>
                      {canCheckout ? 'اختيار' : 'غير متاحة'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>إغلاق</button>
        </div>
      </form>
    </LibraryModal>
  );
}
