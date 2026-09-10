'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { StudentSectionSkeleton } from '@/features/admin/students/components/student-360-loading';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale } from '@/features/i18n/locale-context';
import { refName } from '@/lib/utils/finance';
import type { StudentFinanceCapabilities } from '@/types/student-finance';
import type { StudentInstallment } from '../types';
import type { StudentFinancePanelProps } from './student-finance-panel-props';
import { BillingAuthorityChangeDialog } from './billing-authority-change-dialog';
import { InstallmentRowStatusBadges } from './installment-status-badges';
import { useStudentFamilyFinanceSummary } from '../hooks/use-student-family-finance';
import { useStudentFinanceInstallmentsPage } from '../hooks/use-student-finance-installments-page';
import { canChangeBillingAuthority } from '../utils/resolve-billing-authority-change-visibility';
import { resolveInstallmentDisplayLabel } from '../utils/resolve-installment-display';
import {
  hasInstallmentPendingChequeCoverage,
  isInstallmentDueNowForSummary,
  isInstallmentOverdueForSummary,
  isInstallmentPaidForSummary,
  isInstallmentUpcomingForSummary,
  resolveEffectiveInstallmentPaymentStatus,
  resolveEffectiveInstallmentTimingStatus,
  resolveMinUnpaidInstallmentSequence,
} from '../utils/resolve-installment-presentation';
import { resolveBillingPartyLabel } from '../utils/resolve-student-finance-overview';
import { resolveStudentFinanceCurrency } from '../utils/resolve-student-finance-currency';
import styles from './student-finance-overview-panel.module.css';

type InstallmentFilter = 'all' | 'overdue' | 'due' | 'upcoming' | 'paid';
type InstallmentClassification = Exclude<InstallmentFilter, 'all'> | 'other';

interface InstallmentMonthGroup {
  key: string;
  label: string;
  sortValue: number;
  status: InstallmentClassification;
  rows: StudentInstallment[];
}

function parseFinanceDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function rowAnchorDate(row: StudentInstallment): Date | null {
  return (
    parseFinanceDate(row.due_date) ??
    parseFinanceDate(row.period_start) ??
    parseFinanceDate(row.period_end)
  );
}

function classificationPriority(value: InstallmentClassification): number {
  if (value === 'overdue') return 0;
  if (value === 'due') return 1;
  if (value === 'upcoming') return 2;
  if (value === 'paid') return 3;
  return 4;
}

function classificationLabelKey(value: InstallmentClassification): string | null {
  if (value === 'overdue') return 'admin.student360.financeWorkspace.schedule.summary.overdue';
  if (value === 'due') return 'admin.student360.financeWorkspace.schedule.summary.due';
  if (value === 'upcoming') return 'admin.student360.financeWorkspace.schedule.summary.upcoming';
  if (value === 'paid') return 'admin.student360.financeWorkspace.schedule.summary.paid';
  return null;
}

function classificationClass(value: InstallmentClassification): string {
  if (value === 'overdue') return styles.monthStatusOverdue;
  if (value === 'due') return styles.monthStatusDue;
  if (value === 'upcoming') return styles.monthStatusUpcoming;
  if (value === 'paid') return styles.monthStatusPaid;
  return styles.monthStatusNeutral;
}

export function StudentFinanceOverviewPanel({
  studentId,
  details,
  capabilities,
  effectiveYearId,
  workspace,
  financialOverview,
  financialOverviewLoading,
  financialOverviewError,
  onReloadFinancialOverview,
  canCollect,
  onRefresh,
  financeRefreshSignal = 0,
  allowInstallmentCollection = true,
}: StudentFinancePanelProps) {
  const { t, locale } = useLocale();
  const { formatDate } = useFormat();
  const [billingAuthorityDialogOpen, setBillingAuthorityDialogOpen] = useState(false);
  const [filter, setFilter] = useState<InstallmentFilter>('all');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => new Set());

  const financeCaps = (financialOverview?.capabilities ??
    workspace?.capabilities) as StudentFinanceCapabilities | undefined;
  const canChangeBillingAuthorityAction = canChangeBillingAuthority(capabilities, financeCaps);

  const billingPartner =
    workspace?.finance_profile?.billing_partner ??
    workspace?.billing_partner ??
    workspace?.current_agreement?.billing_partner ??
    null;
  const billingPartnerName = billingPartner ? refName(billingPartner) : null;
  const billingLabel =
    billingPartnerName ||
    resolveBillingPartyLabel({
      billingProfile: financialOverview?.billing_profile,
      billingPartyType: financialOverview?.billing_profile?.billing_party_type,
      t,
    });

  const familyState = useStudentFamilyFinanceSummary(studentId, true, financeRefreshSignal);
  const family = familyState.data;
  const familyStudentCount = family?.student_count ?? family?.children.length ?? 0;
  const showFamily = family != null && familyStudentCount > 1;
  const familyAccountId = family?.family_id ?? family?.billing_partner_id ?? null;
  const familyNames = useMemo(
    () =>
      (family?.children ?? [])
        .map((child) => child.student_name?.trim() ?? '')
        .filter(Boolean)
        .slice(0, 4),
    [family?.children],
  );
  const hiddenFamilyNames = Math.max(0, familyStudentCount - familyNames.length);

  const academicYearId = Number(effectiveYearId);
  const hasAcademicYear = Number.isFinite(academicYearId) && academicYearId > 0;
  const installmentsQuery = useMemo(
    () =>
      hasAcademicYear
        ? {
            page: 1,
            page_size: 100,
            academic_year_id: academicYearId,
          }
        : null,
    [academicYearId, hasAcademicYear],
  );

  const installmentsState = useStudentFinanceInstallmentsPage(
    studentId,
    installmentsQuery,
    hasAcademicYear,
    financeRefreshSignal,
  );
  const installments = installmentsState.data;
  const allowCollectionClassification = canCollect && allowInstallmentCollection;

  const scheduleContext = useMemo(
    () => ({
      canCollect: allowCollectionClassification,
      minUnpaidSequence: resolveMinUnpaidInstallmentSequence(installments),
    }),
    [allowCollectionClassification, installments],
  );

  const classifications = useMemo(() => {
    const result = new Map<number, InstallmentClassification>();
    for (const row of installments) {
      let classification: InstallmentClassification = 'other';
      if (isInstallmentPaidForSummary(row)) classification = 'paid';
      else if (isInstallmentOverdueForSummary(row)) classification = 'overdue';
      else if (isInstallmentDueNowForSummary(row, scheduleContext)) classification = 'due';
      else if (isInstallmentUpcomingForSummary(row)) classification = 'upcoming';
      result.set(row.id, classification);
    }
    return result;
  }, [installments, scheduleContext]);

  const filterCounts = useMemo(() => {
    const counts: Record<InstallmentFilter, number> = {
      all: installments.length,
      overdue: 0,
      due: 0,
      upcoming: 0,
      paid: 0,
    };
    for (const row of installments) {
      const classification = classifications.get(row.id);
      if (classification && classification !== 'other') counts[classification] += 1;
    }
    return counts;
  }, [classifications, installments]);

  const filteredInstallments = useMemo(
    () =>
      filter === 'all'
        ? installments
        : installments.filter((row) => classifications.get(row.id) === filter),
    [classifications, filter, installments],
  );

  const monthGroups = useMemo<InstallmentMonthGroup[]>(() => {
    const formatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    });
    const groups = new Map<
      string,
      {
        key: string;
        label: string;
        sortValue: number;
        rows: StudentInstallment[];
      }
    >();

    for (const row of filteredInstallments) {
      const date = rowAnchorDate(row);
      const key = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : 'undated';
      const existing = groups.get(key);
      if (existing) {
        existing.rows.push(row);
        continue;
      }
      groups.set(key, {
        key,
        label: date ? formatter.format(date) : t('common.dash'),
        sortValue: date ? date.getTime() : Number.MAX_SAFE_INTEGER,
        rows: [row],
      });
    }

    return [...groups.values()]
      .sort((a, b) => a.sortValue - b.sortValue)
      .map((group) => {
        let status: InstallmentClassification = 'other';
        for (const row of group.rows) {
          const rowStatus = classifications.get(row.id) ?? 'other';
          if (classificationPriority(rowStatus) < classificationPriority(status)) {
            status = rowStatus;
          }
        }
        return { ...group, status };
      });
  }, [classifications, filteredInstallments, locale, t]);

  useEffect(() => {
    if (!monthGroups.length) {
      setExpandedMonths((current) => (current.size ? new Set<string>() : current));
      return;
    }

    setExpandedMonths((current) => {
      const visibleKeys = new Set(monthGroups.map((group) => group.key));
      if ([...current].some((key) => visibleKeys.has(key))) return current;
      const preferred =
        monthGroups.find((group) => group.status === 'overdue') ??
        monthGroups.find((group) => group.status === 'due') ??
        monthGroups[0];
      return new Set(preferred ? [preferred.key] : []);
    });
  }, [monthGroups]);

  const filterOptions: { key: InstallmentFilter; label: string }[] = [
    { key: 'all', label: t('admin.student360.financeOps.filters.all') },
    {
      key: 'overdue',
      label: t('admin.student360.financeWorkspace.schedule.summary.overdue'),
    },
    {
      key: 'due',
      label: t('admin.student360.financeWorkspace.schedule.summary.due'),
    },
    {
      key: 'upcoming',
      label: t('admin.student360.financeWorkspace.schedule.summary.upcoming'),
    },
    {
      key: 'paid',
      label: t('admin.student360.financeWorkspace.schedule.summary.paid'),
    },
  ];

  const visibleFilterOptions = filterOptions.filter(
    (option) => option.key !== 'paid' || filterCounts.paid > 0 || filter === 'paid',
  );

  if (financialOverviewLoading && !financialOverview) {
    return <StudentSectionSkeleton rows={4} />;
  }

  if (financialOverviewError && !financialOverview) {
    return (
      <div className="student-finance-summary-error" role="alert">
        <p>{t('admin.student360.financeOps.summaryLoadError')}</p>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onReloadFinancialOverview}
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const currency = resolveStudentFinanceCurrency({
    financialOverview,
    workspaceSummary: workspace?.summary,
  });

  return (
    <div className={styles.overview}>
      <section
        className={styles.contextGrid}
        aria-label={t('admin.student360.financeWorkspace.billingPartyTitle')}
      >
        <article className={styles.contextCard}>
          <header className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                {t('admin.student360.financeWorkspace.billingPartyTitle')}
              </h3>
              {financialOverview?.billing_profile?.effective_from ? (
                <p className={styles.cardMeta}>
                  {t('admin.student360.financeWorkspace.billingEffectiveFrom')}:{' '}
                  {formatDate(financialOverview.billing_profile.effective_from)}
                </p>
              ) : null}
            </div>
            {canChangeBillingAuthorityAction ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setBillingAuthorityDialogOpen(true)}
              >
                {t('admin.student360.financeWorkspace.billingAuthorityChange.action')}
              </button>
            ) : null}
          </header>
          <p className={styles.responsibleName} dir="auto">
            {billingLabel}
          </p>
        </article>

        {showFamily && family ? (
          <article className={styles.contextCard}>
            <header className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>{t('admin.student360.familyFinance.title')}</h3>
                <p className={styles.cardMeta}>
                  {t('admin.student360.familyFinance.childrenCount')}: {familyStudentCount}
                </p>
              </div>
              {familyAccountId != null ? (
                <Link
                  href={`/admin/finance/billing-accounts/${familyAccountId}?returnTo=${encodeURIComponent(`/admin/students/${studentId}?tab=finance`)}`}
                  className="btn btn--ghost btn--sm"
                >
                  {t('admin.student360.familyFinance.openBillingAccount')}
                </Link>
              ) : null}
            </header>
            {familyNames.length ? (
              <div className={styles.familyNames}>
                {familyNames.map((name, index) => (
                  <span key={`${name}-${index}`} className={styles.familyName} dir="auto">
                    {name}
                  </span>
                ))}
                {hiddenFamilyNames > 0 ? (
                  <span className={styles.familyMore}>+{hiddenFamilyNames}</span>
                ) : null}
              </div>
            ) : null}
          </article>
        ) : null}
      </section>

      <section
        className={styles.installmentsSection}
        aria-label={t('admin.student360.financeWorkspace.tabs.schedule')}
      >
        <header className={styles.installmentsHeader}>
          <div>
            <h3 className={styles.sectionTitle}>
              {t('admin.student360.financeWorkspace.tabs.schedule')}
            </h3>
            <p className={styles.sectionMeta}>
              {t('admin.student360.financeWorkspace.schedule.summary.total')}: {filterCounts.all}
            </p>
          </div>
          <Link
            href={`/admin/students/${studentId}?tab=finance&financeSubTab=schedule`}
            className="btn btn--ghost btn--sm"
          >
            {t('admin.student360.financeWorkspace.openSchedule')}
          </Link>
        </header>

        <div
          className={styles.filterBar}
          role="toolbar"
          aria-label={t('admin.student360.financeWorkspace.tabs.schedule')}
        >
          {visibleFilterOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`${styles.filterChip}${filter === option.key ? ` ${styles.filterChipActive}` : ''}`}
              aria-pressed={filter === option.key}
              onClick={() => setFilter(option.key)}
            >
              <span>{option.label}</span>
              <span className={styles.filterCount}>{filterCounts[option.key]}</span>
            </button>
          ))}
        </div>

        {installmentsState.initialLoading ? <StudentSectionSkeleton rows={5} /> : null}

        {installmentsState.error ? (
          <ApiErrorView error={installmentsState.error} onRetry={installmentsState.reload} />
        ) : null}

        {!installmentsState.initialLoading &&
        !installmentsState.error &&
        filteredInstallments.length === 0 ? (
          <div className={styles.emptyState} role="status">
            {t('admin.student360.financeWorkspace.schedule.emptyTitle')}
          </div>
        ) : null}

        {!installmentsState.error && monthGroups.length ? (
          <div className={styles.monthList}>
            {monthGroups.map((group) => {
              const expanded = expandedMonths.has(group.key);
              const statusKey = classificationLabelKey(group.status);
              return (
                <article key={group.key} className={styles.monthGroup}>
                  <button
                    type="button"
                    className={styles.monthToggle}
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedMonths((current) => {
                        const next = new Set(current);
                        if (next.has(group.key)) next.delete(group.key);
                        else next.add(group.key);
                        return next;
                      })
                    }
                  >
                    <span className={styles.monthIdentity}>
                      <span className={styles.monthChevron} aria-hidden="true">
                        {expanded ? '▾' : '▸'}
                      </span>
                      <strong className={styles.monthLabel}>{group.label}</strong>
                    </span>
                    <span className={styles.monthMeta}>
                      {statusKey ? (
                        <span
                          className={`${styles.monthStatus} ${classificationClass(group.status)}`}
                        >
                          {t(statusKey)}
                        </span>
                      ) : null}
                      <span className={styles.monthCount}>{group.rows.length}</span>
                    </span>
                  </button>

                  {expanded ? (
                    <div className={styles.installmentRows}>
                      {group.rows.map((row) => {
                        const displayName =
                          resolveInstallmentDisplayLabel(row, locale) ||
                          row.fee_name ||
                          row.fee_type_name ||
                          refName(row.service) ||
                          t('common.dash');
                        const classification = classifications.get(row.id) ?? 'other';
                        const pendingCheque = hasInstallmentPendingChequeCoverage(row);
                        const paymentStatus = resolveEffectiveInstallmentPaymentStatus(row);
                        const timingStatus =
                          classification === 'due'
                            ? 'due'
                            : resolveEffectiveInstallmentTimingStatus(row) ??
                              row.timing_status ??
                              'not_applicable';
                        const showConfirmedPaid =
                          typeof row.confirmed_paid_amount === 'number' &&
                          Number.isFinite(row.confirmed_paid_amount) &&
                          row.confirmed_paid_amount > 0;

                        return (
                          <article key={row.id} className={styles.installmentRow}>
                            <div className={styles.installmentRowHeader}>
                              <div className={styles.installmentName} dir="auto">
                                <strong>{displayName}</strong>
                                {row.period_label ? (
                                  <span className={styles.installmentPeriod}>
                                    {row.period_label}
                                  </span>
                                ) : null}
                              </div>
                              <div className={styles.installmentRemaining}>
                                <span className={styles.installmentFactLabel}>
                                  {t('admin.student360.financeWorkspace.schedule.columns.remaining')}
                                </span>
                                <strong>
                                  <FinanceMoney
                                    amount={row.remaining_amount}
                                    currency={currency}
                                  />
                                </strong>
                              </div>
                            </div>

                            <div className={styles.installmentFacts}>
                              <div className={styles.installmentFact}>
                                <span className={styles.installmentFactLabel}>
                                  {t('admin.student360.financeWorkspace.schedule.columns.amount')}
                                </span>
                                <strong>
                                  <FinanceMoney amount={row.amount} currency={currency} />
                                </strong>
                              </div>

                              {showConfirmedPaid ? (
                                <div className={styles.installmentFact}>
                                  <span className={styles.installmentFactLabel}>
                                    {t('admin.student360.financeWorkspace.schedule.columns.paid')}
                                  </span>
                                  <strong>
                                    <FinanceMoney
                                      amount={row.confirmed_paid_amount}
                                      currency={currency}
                                    />
                                  </strong>
                                </div>
                              ) : null}

                              <div className={styles.installmentFact}>
                                <span className={styles.installmentFactLabel}>
                                  {t('admin.student360.financeWorkspace.schedule.columns.dueDate')}
                                </span>
                                <strong>
                                  {row.due_date ? formatDate(row.due_date) : t('common.dash')}
                                </strong>
                              </div>
                            </div>

                            <div className={styles.installmentStatuses}>
                              <InstallmentRowStatusBadges
                                paymentStatus={paymentStatus}
                                timingStatus={timingStatus}
                                isVisible={row.is_visible}
                                pendingChequeCoverage={pendingCheque}
                              />
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <BillingAuthorityChangeDialog
        open={billingAuthorityDialogOpen}
        studentId={studentId}
        details={details}
        currentAuthorityName={billingLabel}
        onClose={() => setBillingAuthorityDialogOpen(false)}
        onSuccess={() => {
          setBillingAuthorityDialogOpen(false);
          onReloadFinancialOverview();
          onRefresh();
        }}
      />
    </div>
  );
}
