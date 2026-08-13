'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { LibraryTitleRow } from './library-contract';
import { LibraryModal, libraryInputClass, libraryPrimaryButton } from './library-ui';

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
    await onSubmit({ titleId: Number(titleId), accession, barcode, shelf });
    setBusy(false);
  }

  return (
    <LibraryModal title="إضافة نسخة مادية" onClose={onClose}>
      {loadError ? <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div> : null}
      <form onSubmit={submit} className="space-y-3">
        <select required disabled={titles.length === 0} className={libraryInputClass} value={titleId} onChange={(event) => setTitleId(event.target.value)}>
          <option value="">اختر عنوان الكتاب</option>
          {titles.map((title) => <option key={title.id} value={title.id}>{title.name}{title.isbn ? ` — ${title.isbn}` : ''}</option>)}
        </select>
        <input required className={libraryInputClass} placeholder="رقم الجرد" value={accession} onChange={(event) => setAccession(event.target.value)} />
        <input className={libraryInputClass} placeholder="باركود النسخة" value={barcode} onChange={(event) => setBarcode(event.target.value)} />
        <input className={libraryInputClass} placeholder="الرف أو الموقع" value={shelf} onChange={(event) => setShelf(event.target.value)} />
        <button disabled={busy || titles.length === 0} className={libraryPrimaryButton}>{busy ? 'جارٍ الحفظ…' : 'حفظ النسخة'}</button>
      </form>
    </LibraryModal>
  );
}
