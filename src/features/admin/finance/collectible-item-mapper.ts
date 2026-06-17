import type { CollectibleItem } from '@/types/student-financial-overview';
import type { StudentInstallment } from '@/features/admin/student-finance/types';

export function collectibleItemToInstallment(item: CollectibleItem): StudentInstallment {
  return {
    id: item.installment_id,
    fee_id: item.student_fee_id ?? undefined,
    fee_name: item.fee_name ?? item.fee_type_name ?? undefined,
    period_label: item.period_label ?? undefined,
    period_start: item.period_start ?? undefined,
    period_end: item.period_end ?? undefined,
    due_date: item.due_date ?? undefined,
    amount: item.original_amount,
    confirmed_paid_amount: item.paid_amount,
    remaining_amount: item.remaining_amount,
    timing_status: (item.timing_status as StudentInstallment['timing_status']) ?? 'not_applicable',
    payment_status: (item.payment_status as StudentInstallment['payment_status']) ?? 'unpaid',
    display_state: item.display_state ?? undefined,
    state: item.state ?? undefined,
    allow_early_payment: item.selectable,
  };
}

export function collectibleItemsToInstallments(items: CollectibleItem[]): StudentInstallment[] {
  return items.filter((item) => item.selectable).map(collectibleItemToInstallment);
}
