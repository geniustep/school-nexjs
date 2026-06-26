import type { ApiErrorBody } from '@/types/api';
import type { StudentCapabilities, StudentDetailsData } from '@/types/student-360';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { StudentFinanceWorkspace } from '../types';
import type { StudentFinanceScheduleMode } from '../utils/resolve-student-finance-action-state';

export interface StudentFinancePanelProps {
  studentId: number;
  details: StudentDetailsData;
  capabilities: StudentCapabilities;
  effectiveYearId: string;
  workspace: StudentFinanceWorkspace | null | undefined;
  financialOverview: StudentFinancialOverview | null;
  financialOverviewLoading: boolean;
  financialOverviewError: ApiErrorBody | null;
  onReloadFinancialOverview: () => void;
  canViewPayments: boolean;
  canCollect: boolean;
  onRefresh: () => void;
  onOpenCollection: () => void;
  financeRefreshSignal?: number;
  /**
   * Schedule presentation mode. Defaults to `official` when omitted so existing
   * usages keep their current (billable) behavior.
   */
  scheduleMode?: StudentFinanceScheduleMode;
  /**
   * Gate for per-installment collection actions. Defaults to `true` when omitted
   * so a draft agreement (which sets it false) is the only case that hides them.
   */
  allowInstallmentCollection?: boolean;
}
