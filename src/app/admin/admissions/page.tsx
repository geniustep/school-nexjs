import { Suspense } from 'react';
import { AdmissionsListPage } from '@/features/admin/admissions/components/admissions-list-page';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

export default function AdminAdmissionsPage() {
  return (
    <Suspense fallback={<div className="muted">…</div>}>
      <AdmissionsListPage />
    </Suspense>
  );
}
