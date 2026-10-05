'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { MobileBottomSheet } from '@/components/ui/mobile-bottom-sheet';
import { InfoBanner } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { ListParams } from '@/types/api';
import type {
  FinanceCommandCenterDrilldown,
  FinanceCommandCenterDrilldownTarget,
  FinanceCommandCenterExplain,
  FinanceCommandCenterMetricKey,
} from '@/types/finance-command-center';
import { resolveFinanceCommandCenterDrilldownQuery } from './command-center-contract';

export interface FinanceCommandCenterDecisionSelection {
  label: string;
  target: FinanceCommandCenterDrilldownTarget;
}

function metricDefinitionKey(metric: FinanceCommandCenterMetricKey): string {
  switch (metric) {
    case 'due_to_date':
      return 'admin.finance.commandCenter.decision.definition.due';
    case 'recognized_collected_to_date':
      return 'admin.finance.commandCenter.decision.definition.collected';
    case 'collection_rate_to_date':
      return 'admin.finance.commandCenter.decision.definition.rate';
    case 'overdue':
      return 'admin.finance.commandCenter.decision.definition.overdue';
    case 'aging':
      return 'admin.finance.commandCenter.decision.definition.aging';
    case 'collection_performance':
      return 'admin.finance.commandCenter.decision.definition.performance';
  }
}

function percentage(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)}%`;
}

function studentFinanceHref(studentId: number | string): string {
  return `/admin/students/${studentId}?tab=finance&returnTo=${encodeURIComponent('/admin/finance/command-center')}`;
}

export function DecisionIntelligenceSheet({
  selection,
  onClose,
}: {
  selection: FinanceCommandCenterDecisionSelection | null;
  onClose: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const { activeAcademicYearId } = useAdminSession();
  const [page, setPage] = useState(1);

  const baseQuery = useMemo(
    () =>
      resolveFinanceCommandCenterDrilldownQuery(
        selection?.target,
        activeAcademicYearId,
      ),
    [selection?.target, activeAcademicYearId],
  );

  useEffect(() => {
    setPage(1);
  }, [selection?.target]);

  const drilldownQuery = useMemo<ListParams | undefined>(
    () => (baseQuery ? { ...baseQuery, page, page_size: 12 } : undefined),
    [baseQuery, page],
  );

  const explain = useAdminResource<FinanceCommandCenterExplain>(
    selection && baseQuery ? endpoints.admin.financeCommandCenterExplain : null,
    baseQuery ?? undefined,
    { keepPreviousData: false },
  );

  const metricKey = (
    explain.data?.metric_key
    ?? (typeof baseQuery?.metric_key === 'string' ? baseQuery.metric_key : null)
  ) as FinanceCommandCenterMetricKey | null;
  const showRecords = metricKey !== 'collection_rate_to_date';

  const drilldown = useAdminResource<FinanceCommandCenterDrilldown>(
    selection && drilldownQuery && showRecords ? endpoints.admin.financeCommandCenterDrilldown : null,
    showRecords ? drilldownQuery : undefined,
    { keepPreviousData: false },
  );

  const explanation = explain.data;
  const currency = explanation?.currency?.name ?? explanation?.meta.currency?.name;
  const pagination = drilldown.meta?.pagination;
  const invalidTarget = Boolean(selection && !baseQuery);

  const showDueColumn = metricKey === 'due_to_date' || metricKey === 'collection_performance';
  const showCollectedColumn = metricKey === 'recognized_collected_to_date' || metricKey === 'collection_performance';
  const showRemainingColumn = metricKey === 'overdue' || metricKey === 'aging' || metricKey === 'collection_performance';

  return (
    <MobileBottomSheet
      open={Boolean(selection)}
      onClose={onClose}
      title={selection?.label}
      closeLabel={t('admin.finance.commandCenter.decision.close')}
    >
      {invalidTarget ? (
        <EmptyState
          compact
          title={t('admin.finance.commandCenter.decision.invalidTargetTitle')}
          description={t('admin.finance.commandCenter.decision.invalidTargetDesc')}
        />
      ) : (
        <div className="fcc-decision-sheet">
          <section className="fcc-decision-sheet__explain">
            <div className="fcc-decision-sheet__section-head">
              <h3>{t('admin.finance.commandCenter.decision.explainTitle')}</h3>
            </div>

            {explain.initialLoading ? (
              <LoadingState label={t('admin.finance.commandCenter.decision.loadingExplain')} />
            ) : explain.error ? (
              <ApiErrorView error={explain.error} onRetry={explain.reload} />
            ) : explanation ? (
              <>
                {explanation.data_quality_status !== 'complete' ? (
                  <InfoBanner
                    tone="amber"
                    title={t('admin.finance.commandCenter.decision.dataQuality')}
                    description={t('admin.finance.commandCenter.decision.dataQualityWarning')}
                  />
                ) : null}

                <div className="fcc-decision-sheet__facts">
                  <div>
                    <span>{t('admin.finance.commandCenter.decision.value')}</span>
                    <strong>
                      {explanation.metric_key === 'collection_rate_to_date' && typeof explanation.value === 'number'
                        ? <bdi dir="ltr">{percentage(explanation.value)}</bdi>
                        : explanation.metric_key === 'collection_performance' && explanation.value && typeof explanation.value === 'object'
                          ? <FinanceMoney amount={explanation.value.due_amount} currency={currency} />
                          : <FinanceMoney amount={typeof explanation.value === 'number' ? explanation.value : null} currency={currency} />}
                    </strong>
                  </div>
                  <div>
                    <span>{t('admin.finance.commandCenter.decision.recordsCount')}</span>
                    <strong><bdi dir="ltr">{explanation.record_count}</bdi></strong>
                  </div>
                  {explanation.period ? (
                    <div>
                      <span>{t('admin.finance.commandCenter.periodColumn')}</span>
                      <strong><bdi dir="ltr">{explanation.period}</bdi></strong>
                    </div>
                  ) : null}
                </div>

                <p className="fcc-decision-sheet__definition">
                  {t(metricDefinitionKey(explanation.metric_key))}
                </p>

                {explanation.metric_key === 'collection_performance' && explanation.value && typeof explanation.value === 'object' ? (
                  <div className="fcc-decision-sheet__formula-grid">
                    <div>
                      <span>{t('admin.finance.commandCenter.due')}</span>
                      <FinanceMoney amount={explanation.value.due_amount} currency={currency} />
                    </div>
                    <div>
                      <span>{t('admin.finance.commandCenter.collected')}</span>
                      <FinanceMoney amount={explanation.value.recognized_collected_amount} currency={currency} />
                    </div>
                    <div>
                      <span>{t('admin.finance.commandCenter.collectionRate')}</span>
                      <strong><bdi dir="ltr">{percentage(explanation.value.collection_rate)}</bdi></strong>
                    </div>
                  </div>
                ) : null}

                {explanation.metric_key === 'collection_rate_to_date' ? (
                  <div className="fcc-decision-sheet__formula-grid">
                    <div>
                      <span>{t('admin.finance.commandCenter.decision.numerator')}</span>
                      <FinanceMoney amount={explanation.numerator} currency={currency} />
                    </div>
                    <div>
                      <span>{t('admin.finance.commandCenter.decision.denominator')}</span>
                      <FinanceMoney amount={explanation.denominator} currency={currency} />
                    </div>
                  </div>
                ) : null}


                {(explanation.excluded_or_unattributed_amount ?? 0) > 0 ? (
                  <div className="fcc-decision-sheet__excluded">
                    <span>{t('admin.finance.commandCenter.decision.unattributedAmount')}</span>
                    <FinanceMoney
                      amount={explanation.excluded_or_unattributed_amount}
                      currency={currency}
                    />
                  </div>
                ) : null}
              </>
            ) : null}
          </section>

          {showRecords ? (
            <section className="fcc-decision-sheet__records">
              <div className="fcc-decision-sheet__section-head">
                <h3>{t('admin.finance.commandCenter.decision.exactDetails')}</h3>
                {pagination ? (
                  <span>
                    {t('admin.finance.commandCenter.decision.recordsCountValue', {
                      count: String(pagination.total),
                    })}
                  </span>
                ) : null}
              </div>

              {drilldown.initialLoading ? (
                <LoadingState label={t('admin.finance.commandCenter.decision.loadingDetails')} />
              ) : drilldown.error ? (
                <ApiErrorView error={drilldown.error} onRetry={drilldown.reload} />
              ) : !drilldown.data?.items.length ? (
                <EmptyState compact description={t('admin.finance.commandCenter.decision.noRecords')} />
              ) : (
                <>
                  <div className="fcc-table-wrap">
                    <table className="fcc-table fcc-decision-table">
                      <thead>
                        <tr>
                          <th>{t('admin.finance.commandCenter.decision.student')}</th>
                          <th>{t('admin.finance.commandCenter.decision.installment')}</th>
                          <th>{t('admin.finance.commandCenter.decision.dueDate')}</th>
                          {showDueColumn ? <th>{t('admin.finance.commandCenter.due')}</th> : null}
                          {showCollectedColumn ? <th>{t('admin.finance.commandCenter.collected')}</th> : null}
                          {showRemainingColumn ? <th>{t('admin.finance.commandCenter.remaining')}</th> : null}
                          <th>{t('admin.finance.commandCenter.decision.action')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drilldown.data.items.map((item) => (
                          <tr key={item.id ?? `${item.student_id ?? 'student'}-${item.due_date ?? 'date'}-${item.sequence ?? 'seq'}` }>
                            <td>{item.student_name ?? '—'}</td>
                            <td>{item.installment_description ?? item.name ?? '—'}</td>
                            <td>
                              <bdi dir="ltr">
                                {item.due_date ? formatDate(item.due_date) : '—'}
                              </bdi>
                            </td>
                            {showDueColumn ? <td><FinanceMoney amount={item.amount} currency={currency} /></td> : null}
                            {showCollectedColumn ? <td><FinanceMoney amount={item.paid_amount} currency={currency} /></td> : null}
                            {showRemainingColumn ? <td><FinanceMoney amount={item.remaining_amount} currency={currency} /></td> : null}
                            <td>
                              {item.student_id ? (
                                <Link
                                  href={studentFinanceHref(item.student_id)}
                                  className="btn btn--ghost btn--sm"
                                >
                                  {t('admin.finance.commandCenter.decision.openStudentFinance')}
                                </Link>
                              ) : (
                                <span className="muted">{t('common.dash')}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {pagination && pagination.total_pages > 1 ? (
                    <div className="fcc-decision-sheet__pagination">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={pagination.page <= 1 || drilldown.loading}
                      >
                        {t('admin.finance.commandCenter.decision.previousPage')}
                      </button>
                      <span>
                        <bdi dir="ltr">{pagination.page} / {pagination.total_pages}</bdi>
                      </span>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setPage((current) => Math.min(pagination.total_pages, current + 1))}
                        disabled={pagination.page >= pagination.total_pages || drilldown.loading}
                      >
                        {t('admin.finance.commandCenter.decision.nextPage')}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          ) : explanation ? (
            <p className="fcc-decision-sheet__rate-note">
              {t('admin.finance.commandCenter.decision.rateNoDuplicateTable')}
            </p>
          ) : null}
        </div>
      )}
    </MobileBottomSheet>
  );
}
