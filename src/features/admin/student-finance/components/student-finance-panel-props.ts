import type { ApiErrorBody } from '@/types/api';
import type { FinanceInstallmentListSummary } from '@/types/finance';
import type { StudentCapabilities, StudentDetailsData } from '@/types/student-360';
import type { StudentFinanceSummaryData } from '@/types/student-finance';
import type { StudentFinanceWorkspace } from '../types';

export interface StudentFinancePanelProps {
  studentId: number;
  details: StudentDetailsData;
  capabilities: StudentCapabilities;
  effectiveYearId: string;
  workspace: StudentFinanceWorkspace | null | undefined;
  officialSummary: StudentFinanceSummaryData | null;
  officialSummaryLoading: boolean;
  officialSummaryError: ApiErrorBody | null;
  onReloadOfficialSummary: () => void;
  installmentsSummary: FinanceInstallmentListSummary | null;
  canViewPayments: boolean;
  canCollect: boolean;
  onRefresh: () => void;
  onOpenCollection: () => void;
}
