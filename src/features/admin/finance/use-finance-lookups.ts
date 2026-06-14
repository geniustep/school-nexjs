'use client';

import { useMemo } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import {
  academicYearFromSource,
  academicYearsFromFeePlans,
  mergeAcademicYearOptions,
  type AcademicYearOption,
} from '@/lib/utils/academic-years';
import { parseFinanceList } from '@/lib/utils/finance-normalize';
import type { ClassDetail } from '@/features/admin/entity-forms';
import type {
  AcademicYearReference,
  FeePlan,
  FeeType,
  FinanceReferenceData,
  PaymentJournal,
} from '@/types/finance';
import { buildConfirmedFeePlansQuery } from './fee-plan-assign-query';
import { normalizeFeePlanLines } from '@/lib/utils/fee-plan-line-normalize';

export function useFinanceReferenceData(): {
  data: FinanceReferenceData | null;
  journals: PaymentJournal[];
  academicYears: AcademicYearReference[];
  loading: boolean;
  error: import('@/types/api').ApiErrorBody | null;
  reload: () => void;
} {
  const state = useAdminResource<FinanceReferenceData>(endpoints.admin.financeReferenceData);
  const data = state.data;
  const journals = useMemo(
    () => parseFinanceList<PaymentJournal>(data?.payment_journals ?? data?.journals),
    [data],
  );
  const academicYears = useMemo(
    () => parseFinanceList<AcademicYearReference>(data?.academic_years),
    [data],
  );
  return {
    data,
    journals,
    academicYears,
    loading: state.loading,
    error: state.error,
    reload: state.reload,
  };
}

export function useAcademicYearOptions(classId?: number | null): {
  options: AcademicYearOption[];
  loading: boolean;
} {
  const refState = useAdminResource<FinanceReferenceData>(endpoints.admin.financeReferenceData);
  const refYears = useMemo(
    () =>
      parseFinanceList<AcademicYearReference>(refState.data?.academic_years).map((y) => ({
        id: y.id,
        name: y.name,
      })),
    [refState.data],
  );

  const plansState = useAdminResource<FeePlan[]>(endpoints.admin.financeFeePlans, {
    page: 1,
    page_size: 100,
  });
  const classState = useAdminResource<ClassDetail>(
    classId ? endpoints.admin.class(classId) : null,
  );

  const options = useMemo(() => {
    if (refYears.length) return refYears;
    return mergeAcademicYearOptions(
      ...academicYearsFromFeePlans(plansState.data),
      academicYearFromSource(classState.data),
    );
  }, [refYears, plansState.data, classState.data]);

  return {
    options,
    loading: refState.loading || plansState.loading || (classId != null && classState.loading),
  };
}

export function useConfirmedFeePlanOptions(
  academicYearId?: string | number | null,
  levelId?: number | null,
): {
  plans: FeePlan[];
  loading: boolean;
  error: import('@/types/api').ApiErrorBody | null;
  reload: () => void;
} {
  const query = useMemo(
    () => buildConfirmedFeePlansQuery(academicYearId, levelId),
    [academicYearId, levelId],
  );
  const state = useAdminResource<FeePlan[]>(
    query ? endpoints.admin.financeFeePlans : null,
    query ?? undefined,
  );
  const plans = useMemo(() => {
    const raw = state.data ?? [];
    return raw.map((plan) => ({
      ...plan,
      lines: plan.lines ? normalizeFeePlanLines(plan.lines) : plan.lines,
    }));
  }, [state.data]);
  return {
    plans,
    loading: state.loading,
    error: state.error,
    reload: state.reload,
  };
}

export function useFeeTypeOptions(): {
  feeTypes: FeeType[];
  loading: boolean;
} {
  const state = useAdminResource<FeeType[]>(endpoints.admin.financeFeeTypes, {
    page: 1,
    page_size: 100,
    active: 1,
  });
  return { feeTypes: state.data ?? [], loading: state.loading };
}

/** Journals are loaded dynamically from reference-data (FIN-WEB-2). */
export function useFinanceJournalsAvailable(): {
  available: boolean;
  loading: boolean;
} {
  const { journals, loading } = useFinanceReferenceData();
  return { available: journals.length > 0, loading };
}
