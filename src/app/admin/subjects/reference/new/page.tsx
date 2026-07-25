'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { PageHeader } from '@/components/ui/primitives';
import { ReferenceSubjectCreateForm } from '@/features/admin/subjects/components/reference-subject-create-form';
import { useT } from '@/features/i18n/locale-context';

export default function AdminReferenceSubjectCreatePage() {
  const t = useT();

  return (
    <div className="admin-workspace">
      <Link href="/admin/subjects" className="back-link">
        ‹ {t('nav.subjects')}
      </Link>
      <PageHeader
        title={t('admin.referenceSubjects.pageTitle')}
        subtitle={t('admin.referenceSubjects.pageDesc')}
      />
      <ReferenceSubjectCreateForm />
    </div>
  );
}
