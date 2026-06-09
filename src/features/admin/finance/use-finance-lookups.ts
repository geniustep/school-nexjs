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
import type { ClassDetail } from '@/features/admin/entity-forms';
import type { FeePlan, FeeType } from '@/types/finance';

export function useAcademicYearOptions(classId?: number | null): {
  options: AcademicYearOption[];
  loading: boolean;
} {
  const plansState = useAdminResource<FeePlan[]>(endpoints.admin.financeFeePlans, {
    page: 1,
    page_size: 100,
  });
  const classState = useAdminResource<ClassDetail>(
    classId ? endpoints.admin.class(classId) : null,
  );

  const options = useMemo(
    () =>
      mergeAcademicYearOptions(
        ...academicYearsFromFeePlans(plansState.data),
        academicYearFromSource(classState.data),
      ),
    [plansState.data, classState.data],
  );

  return {
    options,
    loading: plansState.loading || (classId != null && classState.loading),
  };
}

export function useConfirmedFeePlanOptions(): {
  plans: FeePlan[];
  loading: boolean;
} {
  const state = useAdminResource<FeePlan[]>(endpoints.admin.financeFeePlans, {
    page: 1,
    page_size: 100,
    state: 'confirmed',
  });
  return { plans: state.data ?? [], loading: state.loading };
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

/** Finance payment journals are not exposed on API v1 — collection create stays blocked. */
export const FINANCE_JOURNAL_LOOKUP_AVAILABLE = false;
