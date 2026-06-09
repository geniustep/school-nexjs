'use client';

import { useMemo } from 'react';
import '@/features/admin/finance/finance-ui.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useResource } from '@/lib/hooks/use-resource';
import { endpoints } from '@/lib/api/endpoints';
import { financeStudentDisplayName } from '@/lib/utils/finance';
import { parseFinanceList } from '@/lib/utils/finance-normalize';
import type { ParentFinanceChildSummary, ParentFinanceOverview } from '@/types/finance';

export default function ParentFinanceOverviewPage() {
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const state = useResource<ParentFinanceOverview | ParentFinanceChildSummary[]>(
    endpoints.parent.finance,
  );

  const children = useMemo(
    () => parseFinanceList<ParentFinanceChildSummary>(state.data),
    [state.data],
  );
  const viewState = { ...state, data: children };

  return (
    <>
      <PageHeader title={t('parent.finance.title')} subtitle={t('parent.finance.subtitle')} />
      <ResourceView
        state={viewState}
        loadingLabel={t('common.loading')}
        empty={<EmptyState title={t('parent.finance.noChildrenFinance')} />}
      >
        {(rows) => (
          <div className="finance-parent-grid">
            {rows.map((child) => (
              <button
                key={child.id}
                type="button"
                className="card finance-parent-card"
                onClick={() => router.push(`/parent/children/${child.id}/finance`)}
              >
                <strong>{financeStudentDisplayName(child)}</strong>
                <p className="muted">
                  {[child.school?.name, child.class?.name].filter(Boolean).join(' · ') ||
                    t('common.dash')}
                </p>
                {child.academic_year && (
                  <p className="muted">
                    {typeof child.academic_year === 'string'
                      ? child.academic_year
                      : child.academic_year.name}
                  </p>
                )}
                <dl className="detail-list compact">
                  <div>
                    <dt>{t('parent.finance.totalDue')}</dt>
                    <dd>
                      <FinanceMoney
                        amount={child.total_due ?? child.total_amount}
                        currency={child.currency}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('parent.finance.paid')}</dt>
                    <dd>
                      <FinanceMoney amount={child.paid_amount} currency={child.currency} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('parent.finance.remaining')}</dt>
                    <dd>
                      <FinanceMoney amount={child.remaining_amount} currency={child.currency} />
                    </dd>
                  </div>
                  {(child.overdue_amount ?? 0) > 0 && (
                    <div>
                      <dt>{t('parent.finance.overdue')}</dt>
                      <dd>
                        <FinanceMoney amount={child.overdue_amount} currency={child.currency} />
                      </dd>
                    </div>
                  )}
                  {child.next_due_date && (
                    <div>
                      <dt>{t('parent.finance.nextDue')}</dt>
                      <dd>{formatDate(child.next_due_date)}</dd>
                    </div>
                  )}
                </dl>
                <span className="btn btn--ghost btn--sm">{t('parent.finance.viewChildFinance')}</span>
              </button>
            ))}
          </div>
        )}
      </ResourceView>
      <p className="muted">
        <Link href="/parent/children">{t('nav.myChildren')}</Link>
      </p>
    </>
  );
}
