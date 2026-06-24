'use client';

import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { useStudentFinancialOverview } from '@/features/admin/student-finance/hooks/use-student-financial-overview';
import { resolveFinanceYearId } from '@/features/admin/student-finance/utils/resolve-finance-year-id';
import {
  filterSchoolingWarningItems,
  localizeOverviewWarningToken,
} from '../utils/student-overview-warning-display';
import { StudentStatusSummary } from './student-status-summary';
import { StudentOverviewAlerts } from './student-overview-alerts';
import { StudentOverviewCards } from './student-overview-cards';
import { StudentProfileDetailPanel } from './student-profile-detail-panel';
import { StudentAdmissionDataPanel } from './student-admission-data-panel';
import { StudentSiblingsInfoPanel } from './student-siblings-info-panel';
import type { StudentOverviewData } from '@/types/student-overview';
import type { Student360TabId } from '../utils/student-360-tabs';
import type { StudentDetailsData } from '@/types/student-360';

function scrollToLoginAccount() {
  const target = document.getElementById('student-login-account');
  target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  const createBtn = target?.querySelector<HTMLButtonElement>('.entity-account-panel__create-btn');
  createBtn?.focus();
}

export function StudentOverviewTab({
  studentId,
  details,
  overview,
  overviewLoading,
  overviewEndpointUnavailable,
  canManage,
  showDocuments = false,
  showHealth = false,
  showFinance = false,
  setupMode = false,
  onOpenTab,
  onEditProfile,
  onAccountChanged,
}: {
  studentId: string;
  details: StudentDetailsData;
  overview: StudentOverviewData | null;
  overviewLoading: boolean;
  overviewEndpointUnavailable: boolean;
  canManage: boolean;
  showDocuments?: boolean;
  showHealth?: boolean;
  showFinance?: boolean;
  setupMode?: boolean;
  onOpenTab?: (tab: Student360TabId, options?: { financeSubTab?: string }) => void;
  onEditProfile?: () => void;
  onAccountChanged: () => void;
}) {
  const financeRefState = useFinanceReferenceData();
  const financeYearId = useMemo(
    () => resolveFinanceYearId(details, financeRefState.academicYears, ''),
    [details, financeRefState.academicYears],
  );
  const financialOverviewState = useStudentFinancialOverview(
    studentId,
    financeYearId,
    showFinance && !!financeYearId,
  );

  const t = useT();
  const openTab = (tab: Student360TabId, options?: { financeSubTab?: string }) =>
    onOpenTab?.(tab, options);

  const schoolingWarnings = useMemo(
    () =>
      filterSchoolingWarningItems([
        ...(overview?.schooling?.gaps ?? []),
        ...(overview?.schooling?.warnings ?? []),
      ]),
    [overview?.schooling?.gaps, overview?.schooling?.warnings],
  );

  return (
    <div className="student-360-overview student-360-tab-panel">
      <StudentOverviewAlerts alerts={overview?.alerts ?? []} onOpenTab={(tab) => openTab(tab)} />

      {schoolingWarnings.length > 0 ? (
        <div className="student-360-overview__schooling-notes" role="status">
          <ul className="student-overview-card__warnings">
            {schoolingWarnings.map((item) => (
              <li key={item}>{localizeOverviewWarningToken(t, item)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <StudentStatusSummary
        details={details}
        financialOverview={financialOverviewState.data}
        canManage={canManage}
        showDocuments={showDocuments}
        showHealth={showHealth}
        showFinance={showFinance}
        setupMode={setupMode}
        onOpenTab={(tab, options) => openTab(tab, options)}
        onEditProfile={onEditProfile}
        onCreateAccount={canManage ? scrollToLoginAccount : undefined}
      />

      <StudentOverviewCards
        overview={overview}
        loading={overviewLoading}
        endpointUnavailable={overviewEndpointUnavailable}
      />

      <div className="student-360-overview__details-layout">
      <StudentProfileDetailPanel
        details={details}
        canManage={canManage}
        onEditProfile={onEditProfile}
        onAccountChanged={onAccountChanged}
      />

      <div className="student-360-overview__details-aside">
        <StudentAdmissionDataPanel student={details.student} />
        <StudentSiblingsInfoPanel student={details.student} />
      </div>
      </div>
    </div>
  );
}
