'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { LibraryTitleRow } from './library-contract';
import { LibraryModal, libraryInputClass, libraryPrimaryButton } from './library-ui';

export type LibraryTitleFormValues = {
  name: string;
  authors: string;
  publisher: string;
  isbn: string;
  policy: 'loanable' | 'library_only';
};

export function LibraryTitleForm({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: LibraryTitleRow | null;
  onClose: () => void;
  onSubmit: (values: LibraryTitleFormValues) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [authors, setAuthors] = useState(initial?.authors ?? '');
  const [publisher, setPublisher] = useState(initial?.publisher ?? '');
  const [isbn, setIsbn] = useState(initial?.isbn ?? '');
  const [policy, setPolicy] = useState<'loanable' | 'library_only'>(initial?.default_circulation_policy ?? 'loanable');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ name, authors, publisher, isbn, policy });
    } finally {
      setBusy(false);
    }
  }

  return (
    <LibraryModal title={initial ? 'تعديل العنوان' : 'إضافة عنوان'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required className={libraryInputClass} placeholder="عنوان الكتاب" value={name} onChange={(event) => setName(event.target.value)} />
        <input className={libraryInputClass} placeholder="المؤلف أو المؤلفون" value={authors} onChange={(event) => setAuthors(event.target.value)} />
        <input className={libraryInputClass} placeholder="الناشر" value={publisher} onChange={(event) => setPublisher(event.target.value)} />
        <input className={libraryInputClass} placeholder="ISBN" value={isbn} onChange={(event) => setIsbn(event.target.value)} />
        <select className={libraryInputClass} value={policy} onChange={(event) => setPolicy(event.target.value as 'loanable' | 'library_only')}>
          <option value="loanable">قابلة للإعارة</option>
          <option value="library_only">داخل المكتبة فقط</option>
        </select>
        <button disabled={busy || !name.trim()} className={libraryPrimaryButton}>{busy ? 'جارٍ الحفظ…' : initial ? 'حفظ التعديلات' : 'حفظ العنوان'}</button>
      </form>
    </LibraryModal>
  );
}
