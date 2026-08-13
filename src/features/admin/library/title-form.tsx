'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { LibraryModal, libraryInputClass, libraryPrimaryButton } from './library-ui';

export function LibraryTitleForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (values: { name: string; authors: string; publisher: string; isbn: string; policy: 'loanable' | 'library_only' }) => Promise<void> }) {
  const [name, setName] = useState('');
  const [authors, setAuthors] = useState('');
  const [publisher, setPublisher] = useState('');
  const [isbn, setIsbn] = useState('');
  const [policy, setPolicy] = useState<'loanable' | 'library_only'>('loanable');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    await onSubmit({ name, authors, publisher, isbn, policy });
    setBusy(false);
  }

  return (
    <LibraryModal title="إضافة عنوان" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required className={libraryInputClass} placeholder="عنوان الكتاب" value={name} onChange={(event) => setName(event.target.value)} />
        <input className={libraryInputClass} placeholder="المؤلف أو المؤلفون" value={authors} onChange={(event) => setAuthors(event.target.value)} />
        <input className={libraryInputClass} placeholder="الناشر" value={publisher} onChange={(event) => setPublisher(event.target.value)} />
        <input className={libraryInputClass} placeholder="ISBN" value={isbn} onChange={(event) => setIsbn(event.target.value)} />
        <select className={libraryInputClass} value={policy} onChange={(event) => setPolicy(event.target.value as 'loanable' | 'library_only')}>
          <option value="loanable">قابلة للإعارة</option>
          <option value="library_only">داخل المكتبة فقط</option>
        </select>
        <button disabled={busy} className={libraryPrimaryButton}>{busy ? 'جارٍ الحفظ…' : 'حفظ العنوان'}</button>
      </form>
    </LibraryModal>
  );
}
