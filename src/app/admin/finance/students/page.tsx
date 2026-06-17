import { redirect } from 'next/navigation';

export default async function AdminFinanceStudentsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ fee_plan_id?: string }>;
}) {
  const params = await searchParams;
  const feePlanId = params.fee_plan_id?.trim();
  if (feePlanId && /^\d+$/.test(feePlanId)) {
    redirect(`/admin/finance/fee-plans/${feePlanId}/assign`);
  }
  redirect('/admin/finance/fee-plans');
}
