'use client';

import { useEffect, useState } from 'react';
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

export function LibraryTitleCopyCheckout({
  title,
  onClose,
  onSelect,
}: {
  title: LibraryTitleRow;
  onClose: () => void;
  onSelect: (copy: LibraryCopyRow) => void;
}) {
  const [rows, setRows] = useState<LibraryCopyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void api.get<LibraryCopyRow[]>(libraryEndpoints.copies, {
      page: 1,
      page_size: 100,
      active: 1,
      title_id: title.id,
    }).then((result) => {
      if (!active) return;
      setLoading(false);
      if (!result.success) {
        setRows([]);
        setError(libraryErrorMessage(result));
        return;
      }
      const copies = Array.isArray(result.data) ? result.data : [];
      const eligible = copies.filter((copy) => libraryActionAllowed(copy.allowed_actions, 'checkout'));
      if (eligible.length === 1) {
        onSelect(eligible[0]);
        return;
      }
      setRows(copies);
    });
    return () => { active = false; };
  }, [onSelect, title.id]);

  return (
    <LibraryModal title="إعارة كتاب" onClose={onClose}>
      <div className="form-stack">
        <div className="library-form-summary">
          <strong dir="auto">{title.name}</strong>
          <span className="muted tiny" dir="auto">{title.authors || 'مؤلف غير محدد'}</span>
        </div>

        {loading ? <p className="library-form-status">جارٍ تحميل نسخ الكتاب…</p> : null}
        {error ? <p className="library-form-error" role="alert">{error}</p> : null}

        {!loading && !error && rows.length === 0 ? (
          <div className="state state--compact">
            <div className="state__title">لا توجد نسخ مادية لهذا الكتاب</div>
            <div className="state__desc">أضف نسخة مادية أولًا قبل تنفيذ الإعارة.</div>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <div className="library-lookup-results">
            {rows.map((copy) => {
              const canCheckout = libraryActionAllowed(copy.allowed_actions, 'checkout');
              const blockedReason = libraryCheckoutBlockedReason(copy);
              return (
                <div key={copy.id} className="library-lookup-result">
                  <div className="library-lookup-result__body">
                    <strong>نسخة <bdi className="mono" dir="auto">{copy.accession}</bdi></strong>
                    <span className="library-lookup-result__meta">
                      {copy.barcode ? <>باركود <bdi className="mono" dir="ltr">{copy.barcode}</bdi></> : 'بدون باركود'}
                      {copy.shelf ? <> · الرف <span dir="auto">{copy.shelf}</span></> : null}
                    </span>
                    {blockedReason ? <span className="library-lookup-result__reason">{blockedReason}</span> : null}
                  </div>
                  <div className="library-lookup-result__action">
                    <Badge tone={copy.state === 'available' ? 'green' : 'slate'}>{libraryStateLabel[copy.state] || copy.state}</Badge>
                    <button type="button" className="btn btn--primary btn--sm" disabled={!canCheckout} onClick={() => onSelect(copy)}>
                      {canCheckout ? 'إعارة هذه النسخة' : 'غير متاحة'}
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
      </div>
    </LibraryModal>
  );
}
