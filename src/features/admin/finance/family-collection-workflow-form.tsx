'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/tables/data-table';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { QuickPaymentCoreFields } from '@/features/admin/finance/quick-payment-core-fields';
import type { FamilyCollectSource } from '@/features/admin/finance/family-collect-query';
import {
  CollectionCashSessionGate,
  collectionBlockedByCashSession,
  resolveCashSessionCollectionAccess,
} from '@/features/admin/finance/cash-desk/collection-cash-session-gate';
import {
  resolveDefaultPaymentJournal,
} from '@/features/admin/finance/format-payment-journal';
import { useFamilyCollectionContext } from '@/features/admin/finance/hooks/use-family-collection-context';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { fetchCurrentCashSession } from '@/lib/api/finance-cash-desk';
import { currencyCode } from '@/lib/utils/finance';
import {
  familyFinanceServiceTypeLabelKey,
  normalizeFamilyCollectionCreateResponse,
  normalizeFamilyCollectionPreviewResponse,
} from '@/lib/utils/normalize-family-finance';
import { isCashJournal, paymentMethodRequiresCashSession } from '@/lib/utils/cash-payment';
import {
  previewFamilyCollectionAllocation,
  submitFamilyCollection,
  getFamilyFinanceSummary,
} from '@/features/admin/student-finance/api/family-finance-api';
import type {
  FamilyCollectionAllocation,
  FamilyCollectionAllocationMode,
  FamilyCollectionCreateResponse,
  FamilyCollectionPreviewResponse,
  FamilyOpenInstallment,
} from '@/types/family-finance';
import type { CashSession } from '@/types/finance-cash-desk';

function uniqueStudentsFromInstallments(
  installments: FamilyOpenInstallment[],
): Array<{ student_id: number; student_name: string }> {
  const map = new Map<number, string>();
  for (const row of installments) {
    if (typeof row.student_id !== 'number') continue;
    map.set(row.student_id, row.student_name?.trim() || `#${row.student_id}`);
  }
  return Array.from(map.entries()).map(([student_id, student_name]) => ({
    student_id,
    student_name,
  }));
}

function mergeFamilyStudentOptions(
  accountStudents: Array<{ student_id: number; student_name: string }>,
  installmentStudents: Array<{ student_id: number; student_name: string }>,
): Array<{ student_id: number; student_name: string }> {
  const map = new Map<number, string>();
  for (const student of accountStudents) {
    map.set(student.student_id, student.student_name);
  }
  for (const student of installmentStudents) {
    const name = student.student_name?.trim();
    if (name) map.set(student.student_id, name);
  }
  return Array.from(map.entries())
    .map(([student_id, student_name]) => ({ student_id, student_name }))
    .sort((a, b) => a.student_name.localeCompare(b.student_name, undefined, { sensitivity: 'base' }));
}

export function FamilyCollectionWorkflowForm({
  familyId,
  accountName,
  suggestedAmount,
  source,
  currency: suggestedCurrency,
  onDone,
  onCancel,
}: {
  familyId: number;
  accountName?: string;
  suggestedAmount?: number | null;
  source?: FamilyCollectSource | null;
  currency?: unknown;
  onDone: (result: FamilyCollectionCreateResponse) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const user = useSession();
  const { activeSchoolId } = useAdminSession();
  const contextState = useFamilyCollectionContext(familyId);
  const { journals, academicYears, loading: refLoading } = useFinanceReferenceData();

  const [amount, setAmount] = useState('');
  const [limitToStudent, setLimitToStudent] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [journalId, setJournalId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [collectionDate, setCollectionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [academicYearId, setAcademicYearId] = useState('');
  const [allocationMode] = useState<FamilyCollectionAllocationMode>('oldest_due_first');
  const [preview, setPreview] = useState<FamilyCollectionPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [checkingCashSession, setCheckingCashSession] = useState(false);
  const [accountStudents, setAccountStudents] = useState<Array<{ student_id: number; student_name: string }>>(
    [],
  );

  const context = contextState.data;
  const currency = context?.currency;
  const parsedAmount = Number.parseFloat(amount.replace(',', '.'));
  const installmentStudents = useMemo(
    () => uniqueStudentsFromInstallments(context?.open_installments ?? []),
    [context?.open_installments],
  );
  const students = useMemo(
    () => mergeFamilyStudentOptions(accountStudents, installmentStudents),
    [accountStudents, installmentStudents],
  );

  useEffect(() => {
    if (!familyId) {
      setAccountStudents([]);
      return;
    }
    let active = true;
    const query: Record<string, number> = {};
    if (activeSchoolId != null) query.active_school_id = activeSchoolId;

    void getFamilyFinanceSummary(familyId, query).then((res) => {
      if (!active || !res.success || !res.data) return;
      setAccountStudents(
        res.data.children
          .filter((child) => typeof child.student_id === 'number')
          .map((child) => ({
            student_id: child.student_id,
            student_name: child.student_name?.trim() || `#${child.student_id}`,
          })),
      );
    });

    return () => {
      active = false;
    };
  }, [familyId, activeSchoolId]);

  const selectedJournal = useMemo(
    () => journals.find((j) => String(j.id) === journalId) ?? null,
    [journals, journalId],
  );
  const allowedMethods = selectedJournal?.allowed_payment_methods ?? [];
  const journalCurrency = currencyCode(selectedJournal?.currency) ?? currency ?? undefined;

  useEffect(() => {
    if (!journals.length || journalId) return;
    const defaultJournal = resolveDefaultPaymentJournal(journals);
    if (defaultJournal) setJournalId(String(defaultJournal.id));
  }, [journals, journalId]);

  useEffect(() => {
    if (!academicYears.length || academicYearId) return;
    const current = academicYears.find((y) => y.is_current) ?? academicYears[0];
    if (current) setAcademicYearId(String(current.id));
  }, [academicYears, academicYearId]);

  const requiresCashSession =
    !!selectedJournal &&
    isCashJournal(selectedJournal) &&
    paymentMethodRequiresCashSession(paymentMethod);

  useEffect(() => {
    if (!requiresCashSession || !selectedJournal?.id) {
      setCashSession(null);
      return;
    }
    let active = true;
    setCheckingCashSession(true);
    void fetchCurrentCashSession(selectedJournal.id).then((session) => {
      if (!active) return;
      setCashSession(session);
      setCheckingCashSession(false);
    });
    return () => {
      active = false;
    };
  }, [requiresCashSession, selectedJournal?.id]);

  const cashSessionAccess = useMemo(
    () =>
      resolveCashSessionCollectionAccess({
        requiresSession: requiresCashSession,
        checking: checkingCashSession,
        session: cashSession,
        currentUserId: user?.id,
      }),
    [requiresCashSession, checkingCashSession, cashSession, user?.id],
  );
  const cashSessionBlocked = collectionBlockedByCashSession(cashSessionAccess);

  const previewValid = !!preview && !preview.errors.length && previewError == null;

  const allocationColumns: Column<FamilyCollectionAllocation>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('admin.finance.billingAccounts.familyCollection.preview.columns.student'),
        render: (row) => row.student_name ?? t('common.dash'),
      },
      {
        key: 'item',
        header: t('admin.finance.billingAccounts.familyCollection.preview.columns.item'),
        render: (row) =>
          row.service_label?.trim() ||
          (row.service_type
            ? t(familyFinanceServiceTypeLabelKey(row.service_type))
            : t('common.dash')),
      },
      {
        key: 'due_date',
        header: t('admin.finance.billingAccounts.familyCollection.preview.columns.dueDate'),
        render: (row) => (row.due_date ? formatDate(row.due_date) : t('common.dash')),
      },
      {
        key: 'allocated',
        header: t('admin.finance.billingAccounts.familyCollection.preview.columns.allocated'),
        render: (row) => <FinanceMoney amount={row.allocated_amount} currency={currency} />,
      },
    ],
    [t, formatDate, currency],
  );

  function buildQuery() {
    const query: Record<string, number> = {};
    if (activeSchoolId != null) query.active_school_id = activeSchoolId;
    return query;
  }

  async function runPreview() {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setPreviewError(t('admin.finance.billingAccounts.familyCollection.invalidAmount'));
      setPreview(null);
      return;
    }
    if (limitToStudent && !selectedStudentId) {
      setPreviewError(t('admin.finance.billingAccounts.familyCollection.selectStudentRequired'));
      setPreview(null);
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);

    const res = await previewFamilyCollectionAllocation(
      {
        family_id: familyId,
        student_id: limitToStudent ? Number(selectedStudentId) : null,
        amount: parsedAmount,
        allocation_mode: allocationMode,
        manual_allocations: [],
      },
      buildQuery(),
    );

    setPreviewLoading(false);

    if (!res.success) {
      setPreviewError(res.error.message?.trim() || t('admin.finance.billingAccounts.familyCollection.previewFailed'));
      return;
    }

    const normalized = normalizeFamilyCollectionPreviewResponse(res.data);
    if (!normalized) {
      setPreviewError(t('admin.finance.billingAccounts.familyCollection.previewFailed'));
      return;
    }
    if (normalized.errors.length) {
      setPreviewError(normalized.errors.join(' · '));
    }
    setPreview(normalized);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!previewValid || submitting || cashSessionBlocked) return;
    if (!journalId || !paymentMethod || !academicYearId || !collectionDate) {
      setSubmitError(t('admin.finance.billingAccounts.familyCollection.missingFields'));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const res = await submitFamilyCollection(
      {
        family_id: familyId,
        student_id: limitToStudent ? Number(selectedStudentId) : null,
        amount: parsedAmount,
        allocation_mode: allocationMode,
        journal_id: Number(journalId),
        payment_method: paymentMethod,
        collection_date: collectionDate,
        academic_year_id: Number(academicYearId),
        manual_allocations: [],
      },
      buildQuery(),
    );

    setSubmitting(false);

    if (!res.success) {
      setSubmitError(res.error.message?.trim() || t('admin.finance.billingAccounts.familyCollection.submitFailed'));
      return;
    }

    const normalized = normalizeFamilyCollectionCreateResponse(res.data);
    if (!normalized) {
      setSubmitError(t('admin.finance.billingAccounts.familyCollection.submitFailed'));
      return;
    }
    onDone(normalized);
  }

  if (contextState.loading || refLoading) {
    return <LoadingState label={t('admin.finance.billingAccounts.familyCollection.loading')} />;
  }

  if (contextState.error) {
    return (
      <ApiErrorView
        error={{
          code: contextState.error.code,
          message:
            contextState.error.message?.trim() ||
            t('admin.finance.billingAccounts.familyCollection.contextFailed'),
        }}
        onRetry={contextState.reload}
      />
    );
  }

  return (
    <form className="finance-collection-workflow finance-family-collection-workflow" onSubmit={handleSubmit}>
      <div className="finance-collection-workflow__scroll">
        {suggestedAmount != null && suggestedAmount > 0 ? (
          <section
            className="finance-quick-payment-suggestion"
            aria-label={t('admin.finance.quickPayment.currentOverdueLabel')}
          >
            <div className="finance-quick-payment-suggestion__main">
              <span className="finance-quick-payment-suggestion__badge">
                {t('admin.finance.quickPayment.currentOverdueLabel')}
              </span>
              <FinanceMoney
                amount={suggestedAmount}
                currency={suggestedCurrency ?? currency}
                className="finance-quick-payment-suggestion__amount"
              />
            </div>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                setAmount(String(suggestedAmount));
                setPreview(null);
                setPreviewError(null);
              }}
            >
              {t('admin.finance.quickPayment.useOverdueAmount')}
            </button>
          </section>
        ) : context?.total_remaining != null ? (
          <p className="finance-family-collection-workflow__balance tiny muted">
            {t('admin.finance.billingAccounts.metrics.remaining')}:{' '}
            <FinanceMoney amount={context.total_remaining} currency={currency} />
          </p>
        ) : null}

        <section className="collection-form-section finance-quick-payment-primary">
          <QuickPaymentCoreFields
            amount={amount}
            onAmountChange={(value) => {
              setAmount(value);
              setPreview(null);
              setPreviewError(null);
            }}
            amountLabel={t('admin.finance.quickPayment.amountLabel')}
            currency={journalCurrency}
            journalId={journalId}
            onJournalChange={(value) => {
              setJournalId(value);
              setPreview(null);
            }}
            journals={journals}
            selectedJournal={selectedJournal}
            journalsLoading={refLoading}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={(value) => {
              setPaymentMethod(value);
              setPreview(null);
            }}
            allowedMethods={allowedMethods ?? []}
            collectionDate={collectionDate}
            onCollectionDateChange={setCollectionDate}
          />
        </section>

        <details className="finance-collection-advanced">
          <summary>{t('admin.finance.quickPayment.additionalDetails')}</summary>
          <div className="finance-collection-advanced__body">
            <label>
              {t('admin.finance.hub.filterAcademicYear')}
              <select
                className="input"
                required
                value={academicYearId}
                onChange={(e) => {
                  setAcademicYearId(e.target.value);
                  setPreview(null);
                }}
              >
                <option value="">{t('admin.finance.selectAcademicYear')}</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="collection-skip-allocation">
              <input
                type="checkbox"
                checked={limitToStudent}
                onChange={(e) => {
                  setLimitToStudent(e.target.checked);
                  if (!e.target.checked) setSelectedStudentId('');
                  setPreview(null);
                  setPreviewError(null);
                }}
              />
              <span>{t('admin.finance.quickPayment.limitToStudent')}</span>
            </label>
            {limitToStudent ? (
              <label>
                {t('admin.finance.billingAccounts.familyCollection.selectStudent')}
                <select
                  className="input"
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setPreview(null);
                  }}
                >
                  <option value="">{t('admin.finance.billingAccounts.familyCollection.chooseStudent')}</option>
                  {students.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.student_name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </details>

        {previewError ? <p className="form-error collection-form-preview-error">{previewError}</p> : null}

        {preview ? (
          <section className="collection-allocation-preview">
            <h4>{t('admin.finance.billingAccounts.familyCollection.preview.title')}</h4>
            <dl className="detail-list finance-family-collection-preview-metrics">
              <div>
                <dt>{t('admin.finance.billingAccounts.familyCollection.preview.allocated')}</dt>
                <dd>
                  <FinanceMoney amount={preview.allocated_amount} currency={currency} />
                </dd>
              </div>
              <div>
                <dt>{t('admin.finance.billingAccounts.familyCollection.preview.unallocated')}</dt>
                <dd>
                  <FinanceMoney amount={preview.unallocated_amount} currency={currency} />
                </dd>
              </div>
              <div>
                <dt>{t('admin.finance.billingAccounts.familyCollection.preview.credit')}</dt>
                <dd>
                  <FinanceMoney amount={preview.credit_amount ?? preview.credit_balance} currency={currency} />
                </dd>
              </div>
            </dl>
            {preview.warnings.length ? (
              <div className="collection-allocation-preview__warning" role="status">
                {preview.warnings.join(' · ')}
              </div>
            ) : null}
            {preview.allocations.length ? (
              <DataTable
                columns={allocationColumns}
                rows={preview.allocations}
                rowKey={(row) => `${row.student_id ?? 'na'}-${row.installment_id ?? row.due_date ?? 'row'}`}
              />
            ) : null}
          </section>
        ) : null}

        <CollectionCashSessionGate
          journal={selectedJournal}
          paymentMethod={paymentMethod}
          collectionPath={`/admin/finance/billing-accounts/${familyId}`}
          session={cashSession}
          checking={checkingCashSession}
        />

        {submitError ? <p className="form-error">{submitError}</p> : null}
      </div>

      <div className="finance-collection-workflow__actions">
        <div className="finance-collection-workflow__footer form-actions">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={previewLoading || !Number.isFinite(parsedAmount) || parsedAmount <= 0}
            onClick={() => void runPreview()}
          >
            {previewLoading
              ? t('common.loading')
              : t('admin.finance.quickPayment.previewAction')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || !previewValid || cashSessionBlocked}
          >
            {submitting
              ? t('admin.finance.collections.submitting')
              : t('admin.finance.quickPayment.confirmAction')}
          </button>
        </div>
      </div>
    </form>
  );
}
