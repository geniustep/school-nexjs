'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { ApiErrorView } from '@/components/states/states';
import { LoadingState } from '@/components/states/states';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  getFamilyArrearsFollowupDetail,
  submitArrearsFollowup,
} from '@/features/admin/finance/api/arrears-followup-api';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type {
  ArrearsFamilyFollowupDetail,
  ArrearsGuardianRelationshipContext,
} from '@/types/finance-arrears';
import {
  arrearsGuardianRelationshipLabelKey,
  arrearsReferenceLabel,
  groupArrearsInstallmentsByPeriod,
} from '@/features/admin/finance/utils/arrears-family-detail-present';
import './finance-ui.css';

const CONTACT_METHODS = ['phone', 'whatsapp', 'sms', 'email', 'in_person'] as const;
const CONTACT_RESULTS = ['reached', 'no_answer', 'busy', 'wrong_number', 'callback_requested'] as const;

type ArrearsFollowupDrawerProps = {
  open: boolean;
  familyId: number | null;
  familyLabel?: string;
  onClose: () => void;
  onSaved: () => void;
};

export function ArrearsFollowupDrawer({
  open,
  familyId,
  familyLabel,
  onClose,
  onSaved,
}: ArrearsFollowupDrawerProps) {
  const t = useT();
  const toast = useToast();
  const { formatDate } = useFormat();
  const { activeSchoolId } = useAdminSession();

  const [detail, setDetail] = useState<ArrearsFamilyFollowupDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<'contact' | 'promise' | 'resolve' | null>(null);

  const [contactMethod, setContactMethod] = useState('phone');
  const [contactResult, setContactResult] = useState('reached');
  const [contactNotes, setContactNotes] = useState('');
  const [contactNextDate, setContactNextDate] = useState('');

  const [promiseDate, setPromiseDate] = useState('');
  const [promiseAmount, setPromiseAmount] = useState('');
  const [promiseNextDate, setPromiseNextDate] = useState('');
  const [promiseNotes, setPromiseNotes] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);

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
      setValidationError(null);
      setContactNotes('');
      setContactNextDate('');
      setPromiseDate('');
      setPromiseAmount('');
      setPromiseNextDate('');
      setPromiseNotes('');
      return;
    }
    void loadDetail();
  }, [open, loadDetail]);

  const title = useMemo(
    () => detail?.display_name ?? detail?.family_name ?? familyLabel ?? t('admin.finance.arrears.drawerTitle'),
    [detail, familyLabel, t],
  );
  const actionableAmount = detail?.actionable_overdue_amount ?? detail?.total_overdue;
  const grossAmount = detail?.gross_overdue_amount ?? detail?.total_overdue;
  const pendingCoverage = detail?.pending_cheque_coverage_amount;
  const studentsById = useMemo(
    () => new Map((detail?.students ?? []).map((student) => [student.student_id, student])),
    [detail?.students],
  );
  const installmentGroups = useMemo(
    () => groupArrearsInstallmentsByPeriod(detail?.overdue_installments),
    [detail?.overdue_installments],
  );

  function relationshipLabel(value?: string | null): string {
    const key = arrearsGuardianRelationshipLabelKey(value);
    return key ? t(key) : value?.replaceAll('_', ' ') || t('common.dash');
  }

  function guardianFlags(context: ArrearsGuardianRelationshipContext): string {
    return [
      context.is_primary_contact ? t('admin.finance.arrears.familyDetails.primaryContact') : null,
      context.is_financial_responsible ? t('admin.finance.arrears.familyDetails.financialResponsible') : null,
      context.is_legal_guardian ? t('admin.finance.arrears.familyDetails.legalGuardian') : null,
    ].filter((value): value is string => !!value).join(' · ');
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (familyId == null) return;
    setValidationError(null);
    if (!contactMethod || !contactResult) {
      setValidationError(t('admin.finance.arrears.validation.contactRequired'));
      return;
    }
    setSubmitting('contact');
    const query = activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await submitArrearsFollowup(
      {
        family_id: familyId,
        followup_type: 'contact',
        contact_method: contactMethod,
        contact_result: contactResult,
        contact_notes: contactNotes.trim() || undefined,
        next_followup_date: contactNextDate || undefined,
      },
      query,
    );
    setSubmitting(null);
    if (!res.success) {
      toast.error(res.error?.message ?? t('admin.finance.arrears.errors.contactFailed'));
      return;
    }
    toast.success(t('admin.finance.arrears.contactSaved'));
    onSaved();
    void loadDetail();
  }

  async function handlePromiseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (familyId == null) return;
    setValidationError(null);
    const amount = Number(promiseAmount.replace(/\s/g, '').replace(',', '.'));
    if (!promiseDate) {
      setValidationError(t('admin.finance.arrears.validation.promiseDateRequired'));
      return;
    }
    if (!promiseAmount.trim() || Number.isNaN(amount) || amount <= 0) {
      setValidationError(t('admin.finance.arrears.validation.promiseAmountRequired'));
      return;
    }
    setSubmitting('promise');
    const query = activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await submitArrearsFollowup(
      {
        family_id: familyId,
        followup_type: 'payment_promise',
        promise_date: promiseDate,
        promise_amount: amount,
        next_followup_date: promiseNextDate || undefined,
        contact_notes: promiseNotes.trim() || undefined,
      },
      query,
    );
    setSubmitting(null);
    if (!res.success) {
      toast.error(res.error?.message ?? t('admin.finance.arrears.errors.promiseFailed'));
      return;
    }
    toast.success(t('admin.finance.arrears.promiseSaved'));
    onSaved();
    void loadDetail();
  }

  async function handleResolve() {
    if (familyId == null) return;
    setSubmitting('resolve');
    const query = activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await submitArrearsFollowup(
      {
        family_id: familyId,
        followup_type: 'resolve',
      },
      query,
    );
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

  return (
    <SetupDrawer
      open={open}
      title={title}
      subtitle={t('admin.finance.arrears.drawerSubtitle')}
      onClose={onClose}
      size="wide"
      className="finance-arrears-followup-drawer"
      iconClose
    >
      {loading && !detail ? <LoadingState label={t('common.loading')} /> : null}
      {error ? <ApiErrorView error={{ code: 'load_failed', message: error }} /> : null}

      {detail ? (
        <div className="finance-arrears-drawer-content">
          <section className="finance-arrears-drawer-summary card">
            <h3 className="finance-arrears-section-title">{t('admin.finance.arrears.summarySection')}</h3>
            <div className="finance-billing-kpis finance-billing-kpis--compact">
              <div className="finance-billing-kpi finance-billing-kpi--slate">
                <span className="finance-billing-kpi__label">{t('admin.finance.arrears.columns.studentCount')}</span>
                <strong className="finance-billing-kpi__value">{detail.student_count ?? t('common.dash')}</strong>
              </div>
              <div className="finance-billing-kpi finance-billing-kpi--red">
                <span className="finance-billing-kpi__label">{t('admin.finance.arrears.columns.actionableOverdue')}</span>
                <strong className="finance-billing-kpi__value">
                  <FinanceMoney amount={actionableAmount} currency={detail.currency} />
                </strong>
              </div>
              {pendingCoverage != null && pendingCoverage > 0 ? (
                <div className="finance-billing-kpi finance-billing-kpi--blue">
                  <span className="finance-billing-kpi__label">{t('admin.finance.arrears.columns.pendingChequeCoverage')}</span>
                  <strong className="finance-billing-kpi__value">
                    <FinanceMoney amount={pendingCoverage} currency={detail.currency} />
                  </strong>
                </div>
              ) : null}
              {detail.gross_overdue_amount != null ? (
                <div className="finance-billing-kpi finance-billing-kpi--slate">
                  <span className="finance-billing-kpi__label">{t('admin.finance.arrears.columns.grossOverdue')}</span>
                  <strong className="finance-billing-kpi__value">
                    <FinanceMoney amount={grossAmount} currency={detail.currency} />
                  </strong>
                </div>
              ) : null}
              <div className="finance-billing-kpi finance-billing-kpi--amber">
                <span className="finance-billing-kpi__label">{t('admin.finance.arrears.columns.totalRemaining')}</span>
                <strong className="finance-billing-kpi__value">
                  <FinanceMoney amount={detail.total_remaining} currency={detail.currency} />
                </strong>
              </div>
            </div>
            {detail.followup_status_label ? (
              <p className="finance-arrears-status-line">
                <span className="muted">{t('admin.finance.arrears.columns.followupStatus')}:</span>{' '}
                <span dir="auto">{detail.followup_status_label}</span>
              </p>
            ) : null}
          </section>


          {detail.guardians?.length ? (
            <section className="finance-arrears-drawer-last card">
              <h3 className="finance-arrears-section-title">
                {t('admin.finance.arrears.familyDetails.guardiansTitle')}
              </h3>
              <div className="finance-arrears-form">
                {detail.guardians.map((guardian) => (
                  <article key={guardian.guardian_id} className="finance-arrears-drawer-last card">
                    <div>
                      <strong dir="auto">{guardian.name ?? t('common.dash')}</strong>
                      {guardian.is_billing_partner ? (
                        <>
                          {' '}
                          <span className="finance-arrears-badge finance-arrears-badge--blue">
                            {t('admin.finance.arrears.familyDetails.billingGuardian')}
                          </span>
                        </>
                      ) : null}
                    </div>
                    {guardian.relationship_contexts.length ? (
                      <ul>
                        {guardian.relationship_contexts.map((context, index) => {
                          const student = studentsById.get(context.student_id);
                          const flags = guardianFlags(context);
                          return (
                            <li key={`${context.student_id}-${index}`}>
                              <span dir="auto">
                                {student?.student_name ?? `#${context.student_id}`}
                                {' · '}
                                {relationshipLabel(context.relationship_type)}
                              </span>
                              {flags ? <div className="tiny muted">{flags}</div> : null}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {detail.students?.length ? (
            <section className="finance-arrears-drawer-last card">
              <h3 className="finance-arrears-section-title">
                {t('admin.finance.arrears.familyDetails.studentsTitle')}
              </h3>
              <div className="finance-arrears-form">
                {detail.students.map((student) => (
                  <article key={student.student_id} className="finance-arrears-drawer-last card">
                    <strong dir="auto">{student.student_name ?? t('common.dash')}</strong>
                    <dl className="finance-arrears-last-dl">
                      <div>
                        <dt>{t('admin.finance.arrears.familyDetails.studentCode')}</dt>
                        <dd dir="auto">{student.student_code ?? t('common.dash')}</dd>
                      </div>
                      <div>
                        <dt>{t('admin.finance.arrears.familyDetails.class')}</dt>
                        <dd dir="auto">{arrearsReferenceLabel(student.class)}</dd>
                      </div>
                      <div>
                        <dt>{t('admin.finance.arrears.familyDetails.level')}</dt>
                        <dd dir="auto">{arrearsReferenceLabel(student.level)}</dd>
                      </div>
                    </dl>
                    <div className="finance-billing-kpis finance-billing-kpis--compact">
                      <div className="finance-billing-kpi finance-billing-kpi--red">
                        <span className="finance-billing-kpi__label">
                          {t('admin.finance.arrears.columns.actionableOverdue')}
                        </span>
                        <strong className="finance-billing-kpi__value">
                          <FinanceMoney amount={student.actionable_overdue_amount} currency={detail.currency} />
                        </strong>
                      </div>
                      {student.pending_cheque_coverage_amount != null &&
                      student.pending_cheque_coverage_amount > 0 ? (
                        <div className="finance-billing-kpi finance-billing-kpi--blue">
                          <span className="finance-billing-kpi__label">
                            {t('admin.finance.arrears.columns.pendingChequeCoverage')}
                          </span>
                          <strong className="finance-billing-kpi__value">
                            <FinanceMoney amount={student.pending_cheque_coverage_amount} currency={detail.currency} />
                          </strong>
                        </div>
                      ) : null}
                      <div className="finance-billing-kpi finance-billing-kpi--slate">
                        <span className="finance-billing-kpi__label">
                          {t('admin.finance.arrears.columns.grossOverdue')}
                        </span>
                        <strong className="finance-billing-kpi__value">
                          <FinanceMoney amount={student.gross_overdue_amount} currency={detail.currency} />
                        </strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {installmentGroups.length ? (
            <section className="finance-arrears-drawer-last card">
              <h3 className="finance-arrears-section-title">
                {t('admin.finance.arrears.familyDetails.overdueServicesTitle')}
              </h3>
              <div className="finance-arrears-form">
                {installmentGroups.map((group) => (
                  <section key={group.key}>
                    <h4 className="finance-arrears-section-title">
                      {group.periodStart ? formatDate(group.periodStart) : group.key}
                      {group.periodEnd ? ` — ${formatDate(group.periodEnd)}` : ''}
                    </h4>
                    {group.items.map((installment) => (
                      <article key={installment.installment_id} className="finance-arrears-drawer-last card">
                        <strong dir="auto">
                          {installment.fee_type_name ??
                            t('admin.finance.arrears.familyDetails.unknownService')}
                        </strong>
                        <div className="tiny muted" dir="auto">
                          {installment.student_name ?? `#${installment.student_id}`}
                          {installment.student_code ? ` · ${installment.student_code}` : ''}
                        </div>
                        <dl className="finance-arrears-last-dl">
                          <div>
                            <dt>{t('admin.finance.arrears.familyDetails.dueDate')}</dt>
                            <dd dir="ltr">{formatDate(installment.due_date) || t('common.dash')}</dd>
                          </div>
                          <div>
                            <dt>{t('admin.finance.arrears.columns.actionableOverdue')}</dt>
                            <dd><FinanceMoney amount={installment.actionable_overdue_amount} currency={detail.currency} /></dd>
                          </div>
                          <div>
                            <dt>{t('admin.finance.arrears.columns.pendingChequeCoverage')}</dt>
                            <dd><FinanceMoney amount={installment.pending_cheque_coverage_amount} currency={detail.currency} /></dd>
                          </div>
                          <div>
                            <dt>{t('admin.finance.arrears.columns.grossOverdue')}</dt>
                            <dd><FinanceMoney amount={installment.gross_overdue_amount} currency={detail.currency} /></dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            </section>
          ) : null}

          {detail.last_followup ? (
            <section className="finance-arrears-drawer-last card">
              <h3 className="finance-arrears-section-title">{t('admin.finance.arrears.lastFollowupSection')}</h3>
              <dl className="finance-arrears-last-dl">
                <div>
                  <dt>{t('admin.finance.arrears.lastFollowupDate')}</dt>
                  <dd>{formatDate(detail.last_followup.date ?? detail.last_followup.occurred_at) || t('common.dash')}</dd>
                </div>
                {detail.last_followup.contact_method_label || detail.last_followup.contact_method ? (
                  <div>
                    <dt>{t('admin.finance.arrears.fields.contactMethod')}</dt>
                    <dd dir="auto">
                      {detail.last_followup.contact_method_label ??
                        detail.last_followup.contact_method ??
                        t('common.dash')}
                    </dd>
                  </div>
                ) : null}
                {detail.last_followup.contact_result_label || detail.last_followup.contact_result ? (
                  <div>
                    <dt>{t('admin.finance.arrears.fields.contactResult')}</dt>
                    <dd dir="auto">
                      {detail.last_followup.contact_result_label ??
                        detail.last_followup.contact_result ??
                        t('common.dash')}
                    </dd>
                  </div>
                ) : null}
                {detail.last_followup.notes || detail.last_followup.contact_notes ? (
                  <div className="finance-arrears-last-notes">
                    <dt>{t('admin.finance.arrears.fields.contactNotes')}</dt>
                    <dd dir="auto">{detail.last_followup.notes ?? detail.last_followup.contact_notes}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          {validationError ? (
            <p className="finance-arrears-validation-error" role="alert">
              {validationError}
            </p>
          ) : null}

          <section className="finance-arrears-form-section card">
            <h3 className="finance-arrears-section-title">{t('admin.finance.arrears.contactFormTitle')}</h3>
            <form className="finance-arrears-form" onSubmit={handleContactSubmit}>
              <label className="finance-arrears-field">
                <span>{t('admin.finance.arrears.fields.contactMethod')}</span>
                <select
                  className="input"
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value)}
                  required
                >
                  {CONTACT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {t(`admin.finance.arrears.contactMethods.${method}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="finance-arrears-field">
                <span>{t('admin.finance.arrears.fields.contactResult')}</span>
                <select
                  className="input"
                  value={contactResult}
                  onChange={(e) => setContactResult(e.target.value)}
                  required
                >
                  {CONTACT_RESULTS.map((result) => (
                    <option key={result} value={result}>
                      {t(`admin.finance.arrears.contactResults.${result}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="finance-arrears-field">
                <span>{t('admin.finance.arrears.fields.contactNotes')}</span>
                <textarea
                  className="input"
                  rows={3}
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  placeholder={t('admin.finance.arrears.fields.contactNotesPlaceholder')}
                />
              </label>
              <label className="finance-arrears-field">
                <span>{t('admin.finance.arrears.fields.nextFollowupDate')}</span>
                <input
                  className="input"
                  type="date"
                  value={contactNextDate}
                  onChange={(e) => setContactNextDate(e.target.value)}
                />
              </label>
              <div className="finance-arrears-form-actions">
                <button type="submit" className="btn btn--primary btn--sm" disabled={submitting != null}>
                  {submitting === 'contact'
                    ? t('common.saving')
                    : t('admin.finance.arrears.actions.logContact')}
                </button>
              </div>
            </form>
          </section>

          <section className="finance-arrears-form-section card">
            <h3 className="finance-arrears-section-title">{t('admin.finance.arrears.promiseFormTitle')}</h3>
            <form className="finance-arrears-form" onSubmit={handlePromiseSubmit}>
              <label className="finance-arrears-field">
                <span>{t('admin.finance.arrears.fields.promiseDate')}</span>
                <input
                  className="input"
                  type="date"
                  value={promiseDate}
                  onChange={(e) => setPromiseDate(e.target.value)}
                  required
                />
              </label>
              <label className="finance-arrears-field">
                <span>{t('admin.finance.arrears.fields.promiseAmount')}</span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={promiseAmount}
                  onChange={(e) => setPromiseAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>
              <label className="finance-arrears-field">
                <span>{t('admin.finance.arrears.fields.nextFollowupDate')}</span>
                <input
                  className="input"
                  type="date"
                  value={promiseNextDate}
                  onChange={(e) => setPromiseNextDate(e.target.value)}
                />
              </label>
              <label className="finance-arrears-field">
                <span>{t('admin.finance.arrears.fields.promiseNotes')}</span>
                <textarea
                  className="input"
                  rows={2}
                  value={promiseNotes}
                  onChange={(e) => setPromiseNotes(e.target.value)}
                />
              </label>
              <div className="finance-arrears-form-actions">
                <button type="submit" className="btn btn--primary btn--sm" disabled={submitting != null}>
                  {submitting === 'promise'
                    ? t('common.saving')
                    : t('admin.finance.arrears.actions.logPromise')}
                </button>
              </div>
            </form>
          </section>

          {detail.can_resolve !== false ? (
            <div className="finance-arrears-resolve-row">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={submitting != null}
                onClick={() => void handleResolve()}
              >
                {submitting === 'resolve'
                  ? t('common.saving')
                  : t('admin.finance.arrears.actions.resolveFollowup')}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </SetupDrawer>
  );
}
