'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { LibraryTitleRow } from './library-contract';
import { LibraryModal } from './library-ui';

export type PhysicalCopyFormValues = {
  titleId: number;
  accession: string;
  barcode: string;
  shelf: string;
};

export function PhysicalCopyForm({
  titles,
  loadError,
  onClose,
  onSubmit,
}: {
  titles: LibraryTitleRow[];
  loadError: string;
  onClose: () => void;
  onSubmit: (values: PhysicalCopyFormValues) => Promise<void>;
}) {
  const [titleId, setTitleId] = useState('');
  const [accession, setAccession] = useState('');
  const [barcode, setBarcode] = useState('');
  const [shelf, setShelf] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ titleId: Number(titleId), accession, barcode, shelf });
    } finally {
      setBusy(false);
    }
  }

  return (
    <LibraryModal title="إضافة نسخة مادية" onClose={onClose}>
      {loadError ? <p className="library-form-error">{loadError}</p> : null}
      <form onSubmit={submit} className="form-stack">
        <div className="field">
          <label htmlFor="library-copy-title">الكتاب</label>
          <select id="library-copy-title" required disabled={titles.length === 0} className="select" value={titleId} onChange={(event) => setTitleId(event.target.value)}>
            <option value="">اختر عنوان الكتاب</option>
            {titles.map((title) => <option key={title.id} value={title.id}>{title.name}{title.isbn ? ` — ${title.isbn}` : ''}</option>)}
          </select>
        </div>
        <div className="grid grid--form">
          <div className="field">
            <label htmlFor="library-copy-accession">رقم الجرد</label>
            <input id="library-copy-accession" required className="input" dir="auto" value={accession} onChange={(event) => setAccession(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="library-copy-barcode">باركود النسخة</label>
            <input id="library-copy-barcode" className="input" dir="ltr" value={barcode} onChange={(event) => setBarcode(event.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="library-copy-shelf">الرف أو الموقع</label>
          <input id="library-copy-shelf" className="input" dir="auto" value={shelf} onChange={(event) => setShelf(event.target.value)} />
        </div>
        <div className="form-actions">
          <button disabled={busy || titles.length === 0} className="btn btn--primary">{busy ? 'جارٍ الحفظ…' : 'حفظ النسخة'}</button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </LibraryModal>
  );
}
