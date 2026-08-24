import { AdminRequestDetailPage } from '@/features/admin-requests/components/admin-request-detail-page';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AdminRequestDetailPage role="student" requestId={id} />; }
