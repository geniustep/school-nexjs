import { StaffDetailRoutePage } from '@/features/admin/staff/components/staff-detail-page';

export default function AdminStaffDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  return <StaffDetailRoutePage params={params} />;
}
