import type { ApiErrorBody } from '@/types/api';
import type { StudentCapabilities, StudentDetailsData } from '@/types/student-360';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { StudentFinanceWorkspace } from '../types';

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
}
