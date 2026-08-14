'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { LibraryCirculationRow } from './library-contract';
import { LibraryModal, libraryInputClass, libraryPrimaryButton } from './library-ui';

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
      <form onSubmit={submit} className="space-y-3">
        <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
          <div className="font-medium">{loan.title.name}</div>
          <div className="mt-1 text-slate-500">{loan.patron_name || 'المستعير'} · نسخة {loan.copy.accession}</div>
        </div>
        <label className="block space-y-1 text-sm">
          <span>حالة الكتاب عند الإرجاع</span>
          <select className={libraryInputClass} value={returnCondition} onChange={(event) => setReturnCondition(event.target.value as LibraryReturnValues['returnCondition'])}>
            <option value="new">جديدة</option>
            <option value="good">جيدة</option>
            <option value="worn">مستعملة</option>
            <option value="damaged">متضررة</option>
          </select>
        </label>
        <textarea className={libraryInputClass} placeholder="ملاحظات اختيارية" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        <button disabled={busy} className={libraryPrimaryButton}>{busy ? 'جارٍ الاسترجاع…' : 'تأكيد الاسترجاع'}</button>
      </form>
    </LibraryModal>
  );
}
