import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { BillingResponsibilityOutcome } from '@/types/billing-responsibility';
import {
  parseBillingResponsibilityOutcome,
  shouldBlockPostCreateCollectionRedirect,
} from './student-create-billing-responsibility';

export interface PostCreateBillingOutcomeResolution {
  finalOutcome: BillingResponsibilityOutcome;
  billingResponsibilityUnresolved: boolean;
  showUnresolvedWarningToast: boolean;
  showRefreshVerificationToast: boolean;
}

export interface ResolvePostCreateBillingOutcomeParams {
  studentId: number;
  initialOutcome: BillingResponsibilityOutcome;
  guardianLinkSucceeded: boolean;
  activeSchoolId?: number | null;
}

export type FetchAuthoritativeBillingOutcome = (
  studentId: number,
  activeSchoolId?: number | null,
) => Promise<BillingResponsibilityOutcome | null>;

export async function fetchAuthoritativeBillingResponsibilityOutcome(
  studentId: number,
  activeSchoolId?: number | null,
): Promise<BillingResponsibilityOutcome | null> {
  const query: Record<string, number> = {};
  if (activeSchoolId != null) query.active_school_id = activeSchoolId;

  const res = await api.get<unknown>(endpoints.admin.studentFinanceWorkspace(studentId), query);
  if (!res.success || res.data == null) return null;

  return parseBillingResponsibilityOutcome(res.data);
}

export function composePostCreateBillingOutcomeResolution(
  initialOutcome: BillingResponsibilityOutcome,
  options: {
    guardianLinkSucceeded: boolean;
    refreshedOutcome: BillingResponsibilityOutcome | null;
    refreshFailed: boolean;
  },
): PostCreateBillingOutcomeResolution {
  if (!options.guardianLinkSucceeded) {
    const billingResponsibilityUnresolved = shouldBlockPostCreateCollectionRedirect(initialOutcome);
    return {
      finalOutcome: initialOutcome,
      billingResponsibilityUnresolved,
      showUnresolvedWarningToast: billingResponsibilityUnresolved,
      showRefreshVerificationToast: false,
    };
  }

  if (options.refreshFailed || options.refreshedOutcome == null) {
    return {
      finalOutcome: initialOutcome,
      billingResponsibilityUnresolved: true,
      showUnresolvedWarningToast: false,
      showRefreshVerificationToast: true,
    };
  }

  const finalOutcome = options.refreshedOutcome;
  const billingResponsibilityUnresolved = shouldBlockPostCreateCollectionRedirect(finalOutcome);

  return {
    finalOutcome,
    billingResponsibilityUnresolved,
    showUnresolvedWarningToast: billingResponsibilityUnresolved,
    showRefreshVerificationToast: false,
  };
}

export async function resolvePostCreateBillingOutcome(
  params: ResolvePostCreateBillingOutcomeParams,
  fetchAuthoritative: FetchAuthoritativeBillingOutcome = fetchAuthoritativeBillingResponsibilityOutcome,
): Promise<PostCreateBillingOutcomeResolution> {
  if (!params.guardianLinkSucceeded) {
    return composePostCreateBillingOutcomeResolution(params.initialOutcome, {
      guardianLinkSucceeded: false,
      refreshedOutcome: null,
      refreshFailed: false,
    });
  }

  const refreshedOutcome = await fetchAuthoritative(params.studentId, params.activeSchoolId);

  return composePostCreateBillingOutcomeResolution(params.initialOutcome, {
    guardianLinkSucceeded: true,
    refreshedOutcome,
    refreshFailed: refreshedOutcome == null,
  });
}
