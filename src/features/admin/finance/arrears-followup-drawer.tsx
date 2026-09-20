'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  getFamilyArrearsFollowupDetail,
  submitArrearsFollowup,
} from '@/features/admin/finance/api/arrears-followup-api';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type {
  ArrearsFamilyFollowupDetail,
  ArrearsGuardianDetail,
} from '@/types/finance-arrears';
import {
  arrearsGuardianRelationshipLabelKey,
  arrearsReferenceLabel,
  groupArrearsInstallmentsByPeriod,
} from '@/features/admin/finance/utils/arrears-family-detail-present';
import { buildArrearsCollectHref } from '@/lib/utils/normalize-arrears';
import './finance-ui.css';
import './arrears-redesign.css';

const CONTACT_METHODS = ['phone', 'whatsapp', 'sms', 'email', 'in_person'] as const;
const CONTACT_RESULTS = ['reached', 'no_answer', 'busy', 'wrong_number', 'callback_requested'] as const;

type FollowupMode = 'contact' | 'promise';

type ArrearsFollowupDrawerProps = {
  open: boolean;
  familyId: number | null;
  familyLabel?: string;
  returnTo: string;
  onClose: () => void;
  onSaved: () => void;
};

export function ArrearsFollowupDrawer({
  open,
  familyId,
  familyLabel,
  returnTo,
  onClose,
  onSaved,
}: ArrearsFollowupDrawerProps) {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const { formatDate, formatDateLong } = useFormat();
  const { activeSchoolId } = useAdminSession();
  const followupSectionRef = useRef<HTMLElement | null>(null);

  const [detail, setDetail] = useState<ArrearsFamilyFollowupDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<'followup' | 'resolve' | null>(null);
  const [mode, setMode] = useState<FollowupMode>('contact');
  const [contactMethod, setContactMethod] = useState('phone');
  const [contactResult, setContactResult] = useState('reached');
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseAmount, setPromiseAmount] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isDirty = Boolean(
    notes.trim() || promiseDate || promiseAmount.trim() || nextFollowupDate,
  );

  const resetForm = useCallback(() => {
    setMode('contact');
    setContactMethod('phone');
    setContactResult('reached');
    setPromiseDate('');
    setPromiseAmount('');
    setNextFollowupDate('');
    setNotes('');
    setValidationError(null);
  }, []);

  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm(t('admin.finance.arrears.unsavedChangesConfirm'))) return;
    onClose();
  }, [isDirty, onClose, t]);

  const loadDetail = useCallback(async () => {
    if (!open || familyId == null) return;
    setLoading(true);
    setError(null);
    const query = activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await getFamilyArrearsFollowupDetail(familyId, query);
    setLoading(false);
    if (!res.success || !res.data) {
      setError((!res.success ? res.error?.message : null) ?? t('admin.finance.arrears.errors.loadDetailFailed'));
      setDetail(null);
      return;
    }
    setDetail(res.data);
  }, [activeSchoolId, familyId, open, t]);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setError(null);
      resetForm();
      return;
    }
    void loadDetail();
  }, [open, loadDetail, resetForm]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.querySelector<HTMLElement>('.finance-arrears-followup-drawer');
    if (!root) return;
    const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), details > summary, [tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((el) => !el.hasAttribute('hidden'));
    window.setTimeout(() => focusable()[0]?.focus(), 0);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', handleKey);
    return () => {
      root.removeEventListener('keydown', handleKey);
      previous?.focus();
    };
  }, [open]);

  const title = useMemo(
    () => detail?.display_name ?? detail?.family_name ?? familyLabel ?? t('admin.finance.arrears.drawerTitle'),
    [detail, familyLabel, t],
  );
  const actionableAmount = detail?.actionable_overdue_amount ?? detail?.total_overdue;
  const grossAmount = detail?.gross_overdue_amount ?? detail?.total_overdue;
  const pendingCoverage = detail?.pending_cheque_coverage_amount;
  const installmentGroups = useMemo(
    () => groupArrearsInstallmentsByPeriod(detail?.overdue_installments).reverse(),
    [detail?.overdue_installments],
  );
  const billingGuardian = useMemo(
    () => detail?.guardians?.find((guardian) => guardian.is_billing_partner) ?? detail?.guardians?.[0] ?? null,
    [detail?.guardians],
  );
  const otherGuardians = useMemo(
    () => (detail?.guardians ?? []).filter((guardian) => guardian.guardian_id !== billingGuardian?.guardian_id),
    [billingGuardian?.guardian_id, detail?.guardians],
  );

  function relationshipLabel(value?: string | null): string {
    const key = arrearsGuardianRelationshipLabelKey(value);
    return key ? t(key) : value?.replaceAll('_', ' ') || t('common.dash');
  }

  function guardianRelationship(guardian: ArrearsGuardianDetail): string {
    const values = Array.from(new Set(guardian.relationship_contexts.map((context) => relationshipLabel(context.relationship_type))));
    return values.join(' · ') || t('common.dash');
  }

  function periodLabel(value?: string | null, fallback?: string): string {
    if (!value) return fallback ?? t('common.dash');
    const date = new Date(`${value.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return fallback ?? value;
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
  }

  function revealFollowup(nextMode: FollowupMode) {
    setMode(nextMode);
    setValidationError(null);
    window.setTimeout(() => followupSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  async function handleFollowupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (familyId == null) return;
    setValidationError(null);
    const query = activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;

    if (mode === 'promise') {
      const amount = Number(promiseAmount.replace(/\s/g, '').replace(',', '.'));
      if (!promiseDate) {
        setValidationError(t('admin.finance.arrears.validation.promiseDateRequired'));
        return;
      }
      if (!promiseAmount.trim() || Number.isNaN(amount) || amount <= 0) {
        setValidationError(t('admin.finance.arrears.validation.promiseAmountRequired'));
        return;
      }
      setSubmitting('followup');
      const res = await submitArrearsFollowup({
        family_id: familyId,
        followup_type: 'payment_promise',
        promise_date: promiseDate,
        promise_amount: amount,
        next_followup_date: nextFollowupDate || undefined,
        contact_notes: notes.trim() || undefined,
      }, query);
      setSubmitting(null);
      if (!res.success) {
        toast.error(res.error?.message ?? t('admin.finance.arrears.errors.promiseFailed'));
        return;
      }
      toast.success(t('admin.finance.arrears.promiseSaved'));
    } else {
      if (!contactMethod || !contactResult) {
        setValidationError(t('admin.finance.arrears.validation.contactRequired'));
        return;
      }
      setSubmitting('followup');
      const res = await submitArrearsFollowup({
        family_id: familyId,
        followup_type: 'contact',
        contact_method: contactMethod,
        contact_result: contactResult,
        contact_notes: notes.trim() || undefined,
        next_followup_date: nextFollowupDate || undefined,
      }, query);
      setSubmitting(null);
      if (!res.success) {
        toast.error(res.error?.message ?? t('admin.finance.arrears.errors.contactFailed'));
        return;
      }
      toast.success(t('admin.finance.arrears.contactSaved'));
    }

    resetForm();
    onSaved();
    void loadDetail();
  }

  async function handleResolve() {
    if (familyId == null) return;
    setSubmitting('resolve');
    const query = activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await submitArrearsFollowup({ family_id: familyId, followup_type: 'resolve' }, query);
    setSubmitting(null);
    if (!res.success) {
      toast.error(res.error?.message ?? t('admin.finance.arrears.errors.resolveFailed'));
      return;
    }
    toast.success(t('admin.finance.arrears.resolveSaved'));
    onSaved();
    onClose();
  }

  if (!open || familyId == null) return null;

  const collectHref = detail ? buildArrearsCollectHref(detail, returnTo) : '#';

  return (
    <SetupDrawer
      open={open}
      title={title}
      subtitle={billingGuardian?.name ? `${t('admin.finance.arrears.familyDetails.billingGuardian')}: ${billingGuardian.name}` : t('admin.finance.arrears.drawerSubtitle')}
      onClose={requestClose}
      size="wide"
      className="finance-arrears-followup-drawer finance-arrears-redesign-drawer"
      iconClose
      footer={detail ? (
        <div className="finance-arrears-redesign-drawer__footer-actions">
          <Link href={collectHref} className="btn btn--primary btn--sm">{t('admin.finance.arrears.actions.receivePayment')}</Link>
          <button type="button" className={`btn btn--ghost btn--sm${mode === 'contact' ? ' is-active' : ''}`} onClick={() => revealFollowup('contact')}>
            {t('admin.finance.arrears.actions.logContact')}
          </button>
          <button type="button" className={`btn btn--ghost btn--sm${mode === 'promise' ? ' is-active' : ''}`} onClick={() => revealFollowup('promise')}>
            {t('admin.finance.arrears.actions.logPromise')}
          </button>
          {detail.can_resolve !== false ? (
            <button type="button" className="btn btn--ghost btn--sm finance-arrears-redesign-drawer__resolve" disabled={submitting != null} onClick={() => void handleResolve()}>
              {submitting === 'resolve' ? t('common.saving') : t('admin.finance.arrears.actions.resolveFollowup')}
            </button>
          ) : null}
        </div>
      ) : undefined}
    >
      {loading && !detail ? <LoadingState label={t('common.loading')} /> : null}
      {error ? <ApiErrorView error={{ code: 'load_failed', message: error }} /> : null}

      {detail ? (
        <div className="finance-arrears-redesign-drawer__content">
          <section className="finance-arrears-redesign-drawer__hero">
            <div className="finance-arrears-redesign-drawer__hero-main">
              <span>{t('admin.finance.arrears.columns.actionableOverdue')}</span>
              <strong><FinanceMoney amount={actionableAmount} currency={detail.currency} /></strong>
              <Link href={collectHref} className="btn btn--primary btn--sm">{t('admin.finance.arrears.actions.receivePayment')}</Link>
            </div>
            <div className="finance-arrears-redesign-drawer__hero-meta">
              {pendingCoverage != null && pendingCoverage > 0 ? (
                <div><span>{t('admin.finance.arrears.columns.pendingChequeCoverage')}</span><strong><FinanceMoney amount={pendingCoverage} currency={detail.currency} /></strong></div>
              ) : null}
              <div><span>{t('admin.finance.arrears.columns.grossOverdue')}</span><strong><FinanceMoney amount={grossAmount} currency={detail.currency} /></strong></div>
              <div><span>{t('admin.finance.arrears.columns.totalRemaining')}</span><strong><FinanceMoney amount={detail.total_remaining} currency={detail.currency} /></strong></div>
            </div>
          </section>

          <section className="finance-arrears-redesign-drawer__family-block">
            <div className="finance-arrears-redesign-drawer__section-head">
              <h3>{t('admin.finance.arrears.familyDetails.guardiansTitle')}</h3>
              {detail.followup_status_label ? <span className="finance-arrears-badge finance-arrears-badge--amber" dir="auto">{detail.followup_status_label}</span> : null}
            </div>
            {billingGuardian ? (
              <div className="finance-arrears-redesign-drawer__billing-guardian">
                <div>
                  <span>{t('admin.finance.arrears.familyDetails.billingGuardian')}</span>
                  <strong dir="auto">{billingGuardian.name ?? t('common.dash')}</strong>
                </div>
                <span>{guardianRelationship(billingGuardian)}</span>
              </div>
            ) : null}
            {otherGuardians.length ? (
              <div className="finance-arrears-redesign-drawer__guardian-grid">
                {otherGuardians.map((guardian) => (
                  <article key={guardian.guardian_id} className="finance-arrears-redesign-drawer__guardian-card">
                    <strong dir="auto">{guardian.name ?? t('common.dash')}</strong>
                    <span>{guardianRelationship(guardian)}</span>
                    {guardian.phone ? <a href={`tel:${guardian.phone}`} dir="ltr">{guardian.phone}</a> : <span dir="ltr">—</span>}
                  </article>
                ))}
              </div>
            ) : null}
          </section>

          {detail.students?.length ? (
            <section className="finance-arrears-redesign-drawer__section">
              <div className="finance-arrears-redesign-drawer__section-head"><h3>{t('admin.finance.arrears.familyDetails.studentsTitle')}</h3></div>
              <div className="finance-arrears-redesign-drawer__student-table" role="table">
                {detail.students.map((student) => (
                  <div key={student.student_id} className="finance-arrears-redesign-drawer__student-row" role="row">
                    <div className="finance-arrears-redesign-drawer__student-identity" role="cell">
                      <strong dir="auto">{student.student_name ?? t('common.dash')}</strong>
                      <span dir="auto">{arrearsReferenceLabel(student.class)} · {arrearsReferenceLabel(student.level)}</span>
                    </div>
                    <div role="cell"><span>{t('admin.finance.arrears.columns.actionableOverdue')}</span><strong><FinanceMoney amount={student.actionable_overdue_amount} currency={detail.currency} /></strong></div>
                    <div role="cell"><span>{t('admin.finance.arrears.columns.pendingChequeCoverage')}</span><strong><FinanceMoney amount={student.pending_cheque_coverage_amount} currency={detail.currency} /></strong></div>
                    <div role="cell"><span>{t('admin.finance.arrears.columns.grossOverdue')}</span><strong><FinanceMoney amount={student.gross_overdue_amount} currency={detail.currency} /></strong></div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {installmentGroups.length ? (
            <section className="finance-arrears-redesign-drawer__section">
              <div className="finance-arrears-redesign-drawer__section-head"><h3>{t('admin.finance.arrears.familyDetails.overdueServicesTitle')}</h3></div>
              <div className="finance-arrears-redesign-drawer__periods">
                {installmentGroups.map((group, index) => (
                  <details key={group.key} className="finance-arrears-redesign-drawer__period" open={index === 0}>
                    <summary>
                      <strong>{periodLabel(group.periodStart, group.key)}</strong>
                      <span>{group.items.length}</span>
                    </summary>
                    <div className="finance-arrears-redesign-drawer__service-table">
                      {group.items.map((installment) => (
                        <div key={installment.installment_id} className="finance-arrears-redesign-drawer__service-row">
                          <div><strong dir="auto">{installment.student_name ?? `#${installment.student_id}`}</strong><span dir="auto">{installment.fee_type_name ?? t('admin.finance.arrears.familyDetails.unknownService')}</span></div>
                          <div><span>{t('admin.finance.arrears.familyDetails.dueDate')}</span><strong dir="ltr">{formatDate(installment.due_date) || t('common.dash')}</strong></div>
                          <div><span>{t('admin.finance.arrears.columns.actionableOverdue')}</span><strong><FinanceMoney amount={installment.actionable_overdue_amount} currency={detail.currency} /></strong></div>
                          <div><span>{t('admin.finance.arrears.columns.pendingChequeCoverage')}</span><strong><FinanceMoney amount={installment.pending_cheque_coverage_amount} currency={detail.currency} /></strong></div>
                          <div><span>{t('admin.finance.arrears.columns.grossOverdue')}</span><strong><FinanceMoney amount={installment.gross_overdue_amount} currency={detail.currency} /></strong></div>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {detail.last_followup ? (
            <section className="finance-arrears-redesign-drawer__last-followup">
              <div>
                <span>{t('admin.finance.arrears.lastFollowupSection')}</span>
                <strong>{formatDateLong(detail.last_followup.date ?? detail.last_followup.occurred_at) || t('common.dash')}</strong>
              </div>
              <p dir="auto">{detail.last_followup.notes ?? detail.last_followup.contact_notes ?? t('common.dash')}</p>
            </section>
          ) : null}

          <section ref={followupSectionRef} className="finance-arrears-redesign-drawer__followup-panel">
            <div className="finance-arrears-redesign-drawer__section-head">
              <h3>{mode === 'contact' ? t('admin.finance.arrears.contactFormTitle') : t('admin.finance.arrears.promiseFormTitle')}</h3>
              <div className="finance-arrears-redesign-drawer__mode-switch" role="group">
                <button type="button" className={`btn btn--ghost btn--sm${mode === 'contact' ? ' is-active' : ''}`} onClick={() => setMode('contact')}>{t('admin.finance.arrears.actions.logContact')}</button>
                <button type="button" className={`btn btn--ghost btn--sm${mode === 'promise' ? ' is-active' : ''}`} onClick={() => setMode('promise')}>{t('admin.finance.arrears.actions.logPromise')}</button>
              </div>
            </div>

            {validationError ? <p className="finance-arrears-validation-error" role="alert">{validationError}</p> : null}

            <form className="finance-arrears-redesign-drawer__followup-form" onSubmit={handleFollowupSubmit}>
              {mode === 'contact' ? (
                <div className="finance-arrears-redesign-drawer__field-grid">
                  <label className="finance-arrears-field">
                    <span>{t('admin.finance.arrears.fields.contactMethod')}</span>
                    <select className="input" value={contactMethod} onChange={(e) => setContactMethod(e.target.value)} required>
                      {CONTACT_METHODS.map((method) => <option key={method} value={method}>{t(`admin.finance.arrears.contactMethods.${method}`)}</option>)}
                    </select>
                  </label>
                  <label className="finance-arrears-field">
                    <span>{t('admin.finance.arrears.fields.contactResult')}</span>
                    <select className="input" value={contactResult} onChange={(e) => setContactResult(e.target.value)} required>
                      {CONTACT_RESULTS.map((result) => <option key={result} value={result}>{t(`admin.finance.arrears.contactResults.${result}`)}</option>)}
                    </select>
                  </label>
                </div>
              ) : (
                <div className="finance-arrears-redesign-drawer__field-grid">
                  <label className="finance-arrears-field">
                    <span>{t('admin.finance.arrears.fields.promiseDate')}</span>
                    <input className="input" type="date" value={promiseDate} onChange={(e) => setPromiseDate(e.target.value)} required />
                  </label>
                  <label className="finance-arrears-field">
                    <span>{t('admin.finance.arrears.fields.promiseAmount')}</span>
                    <input className="input" inputMode="decimal" value={promiseAmount} onChange={(e) => setPromiseAmount(e.target.value)} placeholder="0.00" required />
                  </label>
                </div>
              )}

              <label className="finance-arrears-field">
                <span>{t('admin.finance.arrears.fields.nextFollowupDate')}</span>
                <input className="input" type="date" value={nextFollowupDate} onChange={(e) => setNextFollowupDate(e.target.value)} />
              </label>
              <label className="finance-arrears-field">
                <span>{t('admin.finance.arrears.fields.contactNotes')}</span>
                <textarea className="input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('admin.finance.arrears.fields.contactNotesPlaceholder')} />
              </label>
              <div className="finance-arrears-form-actions">
                <button type="submit" className="btn btn--primary btn--sm" disabled={submitting != null}>
                  {submitting === 'followup' ? t('common.saving') : mode === 'contact' ? t('admin.finance.arrears.actions.logContact') : t('admin.finance.arrears.actions.logPromise')}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </SetupDrawer>
  );
}