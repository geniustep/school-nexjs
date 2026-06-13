'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { mapGuardianApiError } from '../utils/guardian-api-errors';
import type { GuardianDuplicateMatch, GuardianQuickCreateResponse, GuardianSummary } from '@/types/student-360';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="col" style={{ gap: 4 }}>
      <span className="tiny muted">{label}</span>
      {children}
    </label>
  );
}

export function GuardianQuickCreateForm({
  onCreated,
  onSelectExisting,
}: {
  onCreated: (guardian: GuardianSummary) => void;
  onSelectExisting: (guardian: GuardianSummary) => void;
}) {
  const t = useT();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<GuardianDuplicateMatch[] | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    setSaving(true);
    setMatches(null);
    const payload = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      secondary_phone: secondaryPhone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
    };
    const res = await api.post<GuardianQuickCreateResponse>(endpoints.admin.guardiansQuickCreate, payload);
    setSaving(false);

    if (res.success && res.data?.guardian) {
      toast.success(t('admin.student360.guardianCreated'));
      onCreated(res.data.guardian);
      return;
    }

    if (!res.success) {
      const mapped = mapGuardianApiError(res.error, t);
      if (mapped.matches?.length) {
        setMatches(mapped.matches);
      } else {
        toast.error(mapped.message);
      }
    }
  }

  return (
    <form className="col" style={{ gap: 12 }} onSubmit={submit}>
      <Field label={t('admin.fullName')}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <div className="student-360-form__grid">
        <Field label={t('admin.phone')}>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label={t('admin.student360.secondaryPhone')}>
          <input className="input" value={secondaryPhone} onChange={(e) => setSecondaryPhone(e.target.value)} />
        </Field>
        <Field label={t('admin.email')}>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t('admin.student360.address')}>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </div>

      {matches && matches.length > 0 && (
        <div className="col" style={{ gap: 8 }}>
          <p className="tiny">{t('admin.student360.guardianDuplicate')}</p>
          {matches.map((m) => (
            <div key={m.id} className="between card" style={{ padding: 10 }}>
              <span>{m.name}</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onSelectExisting(m)}>
                {t('admin.student360.selectGuardian')}
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
        {saving ? t('common.saving') : t('admin.student360.createGuardian')}
      </button>
    </form>
  );
}
