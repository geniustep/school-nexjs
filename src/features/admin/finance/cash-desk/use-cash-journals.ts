'use client';

import { useMemo } from 'react';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { isCashJournal } from '@/lib/utils/cash-payment';
import { normalizePaymentJournal } from '@/lib/utils/finance-normalize';
import type { PaymentJournal } from '@/types/finance';

export function useCashJournals() {
  const state = useAdminResource<{ items?: PaymentJournal[] } | PaymentJournal[]>(
    endpoints.admin.financePaymentJournals,
  );

  const journals = useMemo(() => {
    const raw = state.data;
    const list = Array.isArray(raw) ? raw : (raw?.items ?? []);
    return list.map(normalizePaymentJournal).filter(isCashJournal);
  }, [state.data]);

  return {
    journals,
    loading: state.initialLoading,
    error: state.error,
    reload: state.reload,
  };
}
