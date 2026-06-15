'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { mapGuardianApiError } from '../utils/guardian-api-errors';
import type { GuardianRelationship } from '@/types/student-360';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="col" style={{ gap: 4 }}>
      <span className="tiny muted">{label}</span>
      {children}
    </label>
  );
}

export function GuardianEndDialog({
  open,
  studentId,
  relationship,
  onClose,
  onEnded,
}: {
  open: boolean;
  studentId: number;
  relationship: GuardianRelationship | null;
  onClose: () => void;
  onEnded: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [dateEnd, setDateEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!relationship) return;
    setSaving(true);
    setError(null);
    const payload: { date_end?: string; notes?: string } = {};
    if (dateEnd.trim()) payload.date_end = dateEnd.trim();
    if (notes.trim()) payload.notes = notes.trim();

    const res = await api.post(
      endpoints.admin.studentGuardianEnd(studentId, relationship.relationship_id),
      payload,
    );
    setSaving(false);

    if (res.success) {
      toast.success(t('admin.student360.relationshipEnded'));
      onClose();
      onEnded();
      return;
    }

    const mapped = mapGuardianApiError(res.error, t);
    setError(mapped.message);
    toast.error(mapped.message);
  }

  if (!open || !relationship) return null;

  return (
    <SetupDrawer open={open} title={t('admin.student360.endRelationship')} onClose={onClose}>
      <form className="col" style={{ gap: 16 }} onSubmit={submit}>
        <p className="student-360-guardian-end__confirm">{t('admin.student360.endRelationshipConfirm')}</p>
        <p className="tiny muted">{t('admin.student360.endRelationshipHint')}</p>
        <p className="tiny">
          <strong>{relationship.guardian.name}</strong>
        </p>
        <Field label={t('admin.student360.dateEnd')}>
          <input className="input" type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
        </Field>
        <Field label={t('admin.student360.notes')}>
          <textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {error && <p className="tiny" style={{ color: 'var(--danger, #c00)' }}>{error}</p>}
        <div className="row" style={{ gap: 8 }}>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? t('common.saving') : t('admin.student360.confirmEnd')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </SetupDrawer>
  );
}
