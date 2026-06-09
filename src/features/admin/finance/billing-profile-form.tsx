'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { StudentFinanceProfile, UpdateBillingProfilePayload } from '@/types/finance';
import type { Student } from '@/types/student';

export function FinanceBillingProfileForm({
  student,
  onDone,
  onCancel,
}: {
  student: Student;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const classId = student.class?.id ?? null;
  const { options: yearOptions } = useAcademicYearOptions(classId);
  const parents = student.parents ?? [];
  const [billingPartnerType, setBillingPartnerType] = useState(
    parents.length ? 'guardian' : 'student',
  );
  const [guardianId, setGuardianId] = useState(parents[0]?.id ? String(parents[0].id) : '');
  const [payerName, setPayerName] = useState(parents[0]?.name ?? getStudentDisplayName(student));
  const [payerPhone, setPayerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const parent = parents.find((p) => String(p.id) === guardianId);
    if (parent) {
      setPayerName(parent.name);
      if ('phone' in parent && typeof parent.phone === 'string') setPayerPhone(parent.phone);
    }
  }, [guardianId, parents]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (billingPartnerType === 'guardian' && !guardianId) {
      setError(t('admin.finance.guardianRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: UpdateBillingProfilePayload = {
      billing_partner_type: billingPartnerType,
      payer_name: payerName.trim() || undefined,
      payer_phone: payerPhone.trim() || undefined,
    };
    if (billingPartnerType === 'guardian' && guardianId) {
      payload.guardian_id = Number(guardianId);
    }

    const res = await api.put<StudentFinanceProfile>(
      endpoints.admin.financeBillingProfile(student.id),
      payload,
    );
    setSubmitting(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    onDone();
  }

  return (
    <form className="card form-stack" onSubmit={onSubmit}>
      <h3>{t('admin.finance.manageBillingProfile')}</h3>
      {error && <p className="form-error">{error}</p>}
      {yearOptions.length === 0 && (
        <p className="muted">{t('admin.finance.academicYearHintFromPlans')}</p>
      )}
      <label>
        {t('admin.finance.billingPartnerType')}
        <select className="input" value={billingPartnerType} onChange={(e) => setBillingPartnerType(e.target.value)}>
          {parents.length > 0 && (
            <option value="guardian">{t('admin.finance.partnerGuardian')}</option>
          )}
          <option value="student">{t('admin.finance.partnerStudent')}</option>
        </select>
      </label>
      {billingPartnerType === 'guardian' && parents.length > 0 && (
        <label>
          {t('nav.parents')}
          <select className="input" required value={guardianId} onChange={(e) => setGuardianId(e.target.value)}>
            <option value="">{t('admin.finance.selectGuardian')}</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {billingPartnerType === 'guardian' && parents.length === 0 && (
        <p className="form-error">{t('admin.finance.noLinkedGuardian')}</p>
      )}
      <label>
        {t('admin.finance.payerName')}
        <input className="input" value={payerName} onChange={(e) => setPayerName(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.payerPhone')}
        <input className="input" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} />
      </label>
      <div className="row" style={{ gap: 8 }}>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={submitting || (billingPartnerType === 'guardian' && !guardianId)}
        >
          {submitting ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}