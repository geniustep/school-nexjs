import { Suspense } from 'react';
import { AdmissionsListPage } from '@/features/admin/admissions/components/admissions-list-page';
import '@/features/admin/admissions/admissions.css';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

function AdmissionsPageBootFallback() {
  return (
    <div
      className="admissions-page admissions-list-page admissions-list-page--boot"
      data-testid="admissions-page-boot-fallback"
      aria-busy="true"
    >
      <div className="admissions-list-boot-skeleton" />
    </div>
  );
}

export default function AdminAdmissionsPage() {
  return (
    <Suspense fallback={<AdmissionsPageBootFallback />}>
      <AdmissionsListPage />
    </Suspense>
  );
}
