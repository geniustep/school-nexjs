'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { LibraryCirculationRow } from './library-contract';
import { LibraryModal } from './library-ui';

export type LibraryReturnValues = {
  returnCondition: 'new' | 'good' | 'worn' | 'damaged';
  notes: string;
};

export function LibraryReturnForm({
  loan,
  onClose,
  onSubmit,
}: {
  loan: LibraryCirculationRow;
  onClose: () => void;
  onSubmit: (values: LibraryReturnValues) => Promise<void>;
}) {
  const [returnCondition, setReturnCondition] = useState<LibraryReturnValues['returnCondition']>('good');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ returnCondition, notes });
    } finally {
      setBusy(false);
    }
  }

  return (
    <LibraryModal title="استرجاع كتاب" onClose={onClose}>
      <form onSubmit={submit} className="form-stack">
        <div className="library-form-summary">
          <strong dir="auto">{loan.title.name}</strong>
          <span className="muted tiny"><span dir="auto">{loan.patron_name || 'المستعير'}</span> · نسخة <bdi className="mono" dir="auto">{loan.copy.accession}</bdi></span>
        </div>
        <div className="field">
          <label htmlFor="library-return-condition">حالة الكتاب عند الإرجاع</label>
          <select id="library-return-condition" className="select" value={returnCondition} onChange={(event) => setReturnCondition(event.target.value as LibraryReturnValues['returnCondition'])}>
            <option value="new">جديدة</option>
            <option value="good">جيدة</option>
            <option value="worn">مستعملة</option>
            <option value="damaged">متضررة</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="library-return-notes">ملاحظات</label>
          <textarea id="library-return-notes" className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        </div>
        <div className="form-actions">
          <button disabled={busy} className="btn btn--primary">{busy ? 'جارٍ الاسترجاع…' : 'تأكيد الاسترجاع'}</button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </LibraryModal>
  );
}
