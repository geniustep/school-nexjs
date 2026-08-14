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
} from './library-contract';
import { LibraryModal } from './library-ui';

function normalized(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

export function isExactLibraryCopyIdentifierMatch(copy: LibraryCopyRow, query: string): boolean {
  const needle = normalized(query);
  return normalized(copy.accession) === needle || normalized(copy.barcode) === needle;
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
    const result = await api.get<LibraryCopyRow[]>(libraryEndpoints.copies, {
      page: 1,
      page_size: 10,
      active: 1,
      search: value,
    });
    setLoading(false);

    if (!result.success) {
      setResults([]);
      setError(libraryErrorMessage(result));
      return;
    }

    const rows = Array.isArray(result.data) ? result.data : [];
    const exact = rows.filter((copy) => isExactLibraryCopyIdentifierMatch(copy, value));
    const exactCheckout = exact.filter((copy) => libraryActionAllowed(copy.allowed_actions, 'checkout'));
    if (exactCheckout.length === 1) {
      onSelect(exactCheckout[0]);
      return;
    }
    setResults(exact.length > 0 ? exact : rows);
  }

  return (
    <LibraryModal title="إعارة سريعة" onClose={onClose}>
      <form className="form-stack" onSubmit={search}>
        <div className="field">
          <label htmlFor="library-quick-copy">الباركود أو رقم الجرد</label>
          <div className="library-quick-search">
            <input
              ref={inputRef}
              id="library-quick-copy"
              autoFocus
              className="input"
              dir="auto"
              autoComplete="off"
              enterKeyHint="search"
              placeholder="امسح الباركود أو اكتب رقم الجرد"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" className="btn btn--primary" disabled={loading || !query.trim()}>{loading ? 'جارٍ البحث…' : 'بحث'}</button>
          </div>
        </div>

        <p className="library-form-note">قارئ الباركود USB يعمل مباشرة: امسح الرمز ثم Enter. بعد إتمام إعارة سريعة ستعود الخانة جاهزة للنسخة التالية.</p>
        {error ? <p className="library-form-error" role="alert">{error}</p> : null}

        {!loading && searched && results.length === 0 && !error ? (
          <div className="state state--compact">
            <div className="state__title">لم نجد باركودًا أو رقم جرد مطابقًا</div>
            <div className="state__desc">تحقق من الرمز ثم أعد المحاولة.</div>
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
