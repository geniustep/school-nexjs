'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { LibraryCopyCondition, LibraryCopyRow } from './library-contract';
import { LibraryModal } from './library-ui';

export type LibraryCopyEditValues = {
  barcode: string;
  shelf: string;
  policy: 'loanable' | 'library_only';
  condition: LibraryCopyCondition;
};

export function LibraryCopyEditForm({
  copy,
  onClose,
  onSubmit,
}: {
  copy: LibraryCopyRow;
  onClose: () => void;
  onSubmit: (values: LibraryCopyEditValues) => Promise<void>;
}) {
  const [barcode, setBarcode] = useState(copy.barcode ?? '');
  const [shelf, setShelf] = useState(copy.shelf ?? '');
  const [policy, setPolicy] = useState<'loanable' | 'library_only'>(copy.circulation_policy);
  const [condition, setCondition] = useState<LibraryCopyCondition>(copy.condition ?? 'good');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ barcode, shelf, policy, condition });
    } finally {
      setBusy(false);
    }
  }

  return (
    <LibraryModal title="تعديل النسخة" onClose={onClose}>
      <form onSubmit={submit} className="form-stack">
        <div className="library-form-summary">
          <strong dir="auto">{copy.title.name}</strong>
          <span className="muted tiny">رقم الجرد: <bdi className="mono" dir="auto">{copy.accession}</bdi></span>
          <span className="library-form-note">عنوان الكتاب ورقم الجرد ثابتان بعد إنشاء النسخة.</span>
        </div>

        <div className="grid grid--form">
          <div className="field">
            <label htmlFor="library-copy-edit-barcode">الباركود</label>
            <input id="library-copy-edit-barcode" className="input" dir="ltr" value={barcode} onChange={(event) => setBarcode(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="library-copy-edit-shelf">الرف أو الموقع</label>
            <input id="library-copy-edit-shelf" className="input" dir="auto" value={shelf} onChange={(event) => setShelf(event.target.value)} />
          </div>
        </div>

        <div className="grid grid--form">
          <div className="field">
            <label htmlFor="library-copy-edit-policy">سياسة الإعارة</label>
            <select id="library-copy-edit-policy" className="select" value={policy} onChange={(event) => setPolicy(event.target.value as 'loanable' | 'library_only')}>
              <option value="loanable">قابلة للإعارة</option>
              <option value="library_only">داخل المكتبة فقط</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="library-copy-edit-condition">الحالة الفيزيائية</label>
            <select id="library-copy-edit-condition" className="select" value={condition} onChange={(event) => setCondition(event.target.value as LibraryCopyCondition)}>
              <option value="new">جديدة</option>
              <option value="good">جيدة</option>
              <option value="worn">مستعملة</option>
              <option value="damaged">متضررة</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button disabled={busy} className="btn btn--primary">{busy ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}</button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </LibraryModal>
  );
}
