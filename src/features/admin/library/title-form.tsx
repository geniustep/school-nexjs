'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { LibraryTitleRow } from './library-contract';
import { LibraryModal } from './library-ui';

export type LibraryTitleFormValues = {
  name: string;
  authors: string;
  publisher: string;
  isbn: string;
  policy: 'loanable' | 'library_only';
  copiesToAdd: number;
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
  const [copiesToAdd, setCopiesToAdd] = useState(initial ? 0 : 1);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!initial && copiesToAdd < 1) return;
    setBusy(true);
    try {
      await onSubmit({ name, authors, publisher, isbn, policy, copiesToAdd });
    } finally {
      setBusy(false);
    }
  }

  return (
    <LibraryModal title={initial ? 'تعديل الكتاب' : 'إضافة كتاب'} onClose={onClose}>
      <form onSubmit={submit} className="form-stack">
        <div className="field">
          <label htmlFor="library-title-name">عنوان الكتاب</label>
          <input id="library-title-name" required className="input" dir="auto" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="library-title-authors">المؤلف أو المؤلفون</label>
          <input id="library-title-authors" className="input" dir="auto" value={authors} onChange={(event) => setAuthors(event.target.value)} />
        </div>
        <div className="grid grid--form">
          <div className="field">
            <label htmlFor="library-title-publisher">الناشر</label>
            <input id="library-title-publisher" className="input" dir="auto" value={publisher} onChange={(event) => setPublisher(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="library-title-isbn">ISBN</label>
            <input id="library-title-isbn" className="input" dir="ltr" value={isbn} onChange={(event) => setIsbn(event.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="library-title-policy">سياسة الإعارة</label>
          <select id="library-title-policy" className="select" value={policy} onChange={(event) => setPolicy(event.target.value as 'loanable' | 'library_only')}>
            <option value="loanable">قابلة للإعارة</option>
            <option value="library_only">داخل المكتبة فقط</option>
          </select>
        </div>

        {initial ? (
          <div className="library-form-summary">
            <strong>النسخ المادية المسجلة</strong>
            <span className="muted tiny">
              المتاح <bdi dir="ltr">{initial.available_copy_count}</bdi> من <bdi dir="ltr">{initial.copy_count}</bdi> نسخة
            </span>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="library-title-copy-count">{initial ? 'إضافة نسخ جديدة' : 'عدد النسخ عند التسجيل'}</label>
          <input
            id="library-title-copy-count"
            type="number"
            min={initial ? 0 : 1}
            max={50}
            required={!initial}
            className="input"
            dir="ltr"
            value={copiesToAdd}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value || '0', 10);
              setCopiesToAdd(Number.isFinite(parsed) ? Math.max(initial ? 0 : 1, Math.min(50, parsed)) : initial ? 0 : 1);
            }}
          />
          <p className="library-form-note">
            {initial
              ? 'هذا الرقم يضيف نسخًا مادية جديدة ولا يغيّر عدد النسخ المسجلة سابقًا.'
              : 'يسجل رقيم نسخة مادية واحدة على الأقل لكل كتاب ويولّد رقم جرد داخليًا لكل نسخة تلقائيًا.'}
          </p>
        </div>

        <div className="form-actions">
          <button disabled={busy || !name.trim() || (!initial && copiesToAdd < 1)} className="btn btn--primary">
            {busy ? 'جارٍ الحفظ…' : initial ? 'حفظ التعديلات' : 'حفظ الكتاب والنسخ'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </LibraryModal>
  );
}
