'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceCollectionForm } from '@/features/admin/finance/collection-form';
import '@/features/admin/finance/finance-ui.css';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW_PAYMENTS, canCollectPayments } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import { PermissionDeniedState } from '@/components/states/states';
import { appendReturnTo, sanitizeReturnTo } from '@/lib/utils/safe-return-url';

function resolveBackLabel(returnTo: string, t: (key: string) => string): string {
  if (returnTo.includes('/students/')) return t('common.back');
  if (returnTo === '/admin/finance') return t('admin.finance.backToFinance');
  return t('admin.finance.backToCollections');
}

export default function AdminFinanceCollectionNewPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId') ?? searchParams.get('student_id') ?? '';
  const academicYearId =
    searchParams.get('academic_year_id') ?? searchParams.get('academicYearId') ?? '';
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/collections');

  if (!canCollectPayments(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <Link href={returnTo} className="back-link">
        ‹ {resolveBackLabel(returnTo, t)}
      </Link>
      <PageHeader title={t('admin.finance.recordCollection')} subtitle={t('admin.finance.recordCollectionDesc')} />
      <div className="finance-collection-new-page">
        <FinanceCollectionForm
          initialStudentId={studentId || undefined}
          initialAcademicYearId={academicYearId || undefined}
          lockStudent={!!studentId}
          onDone={(id) =>
            router.push(appendReturnTo(`/admin/finance/collections/${id}`, returnTo))
          }
          onCancel={() => router.push(returnTo)}
        />
      </div>
    </RequireAdminPermission>
  );
}
