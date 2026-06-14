'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceHubAlerts } from '@/features/admin/finance/finance-hub-alerts';
import { FinanceHubKpiGrid } from '@/features/admin/finance/finance-hub-kpi-grid';
import { FinanceHubLinks } from '@/features/admin/finance/finance-hub-links';
import { FinanceOverviewPanel } from '@/features/admin/finance/finance-overview-panel';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  FINANCE_VIEW,
  canCollectPayments,
  canViewFinanceSetup,
} from '@/lib/permissions/finance';
import { useFinanceJournalsAvailable } from '@/features/admin/finance/use-finance-lookups';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import type { AdminFinanceOverview } from '@/types/finance';

export default function AdminFinancePage() {
  const t = useT();
  const user = useSession();
  const { activeSchoolId, schools } = useAdminSession();
  const activeSchool = schools.find((s) => s.id === activeSchoolId);
  const { options: yearOptions } = useAcademicYearOptions(null);
  const { available: journalsAvailable } = useFinanceJournalsAvailable();
  const [yearId, setYearId] = useState('');

  const overviewParams = useMemo(
    () => ({ academic_year_id: yearId ? Number(yearId) : undefined }),
    [yearId],
  );
  const overviewState = useAdminResource<AdminFinanceOverview>(
    endpoints.admin.financeOverview,
    overviewParams,
  );

  const currentYear = yearOptions.find((y) => 'is_current' in y && (y as { is_current?: boolean }).is_current);

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <PageHeader
        title={t('admin.finance.hub.title')}
        subtitle={t('admin.finance.hub.description')}
        actions={
          canCollectPayments(user) && journalsAvailable ? (
            <Link href="/admin/finance/collections/new" className="btn btn--primary btn--sm">
              {t('admin.finance.recordCollection')}
            </Link>
          ) : undefined
        }
      />

      <div className="finance-hub-context">
        {activeSchool ? (
          <p className="muted finance-context-line">
            {t('admin.finance.activeSchool')}: <strong>{activeSchool.name}</strong>
          </p>
        ) : null}
        {currentYear ? (
          <p className="muted finance-context-line">
            {t('admin.finance.hub.currentAcademicYear')}: <strong>{currentYear.name}</strong>
          </p>
        ) : null}
        <label className="finance-hub-year-filter">
          <span className="tiny muted">{t('admin.finance.hub.overviewYearFilter')}</span>
          <select className="input" value={yearId} onChange={(e) => setYearId(e.target.value)}>
            <option value="">{t('admin.finance.allAcademicYears')}</option>
            {yearOptions.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <FinanceHubKpiGrid data={overviewState.data} />
      <FinanceHubAlerts data={overviewState.data} />
      <FinanceHubLinks />

      <FinanceOverviewPanel compact overviewData={overviewState.data} />

      {canViewFinanceSetup(user) ? (
        <p className="muted finance-hub-legacy-note">
          {t('admin.finance.hub.legacySetupNote')}{' '}
          <Link href="/admin/finance/fee-types">{t('admin.finance.hubFeeTypes')}</Link>
          {' · '}
          <Link href="/admin/finance/fee-plans">{t('admin.finance.hubFeePlans')}</Link>
        </p>
      ) : null}
    </RequireAdminPermission>
  );
}
