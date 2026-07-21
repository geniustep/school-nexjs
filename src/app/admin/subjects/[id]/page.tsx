'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/primitives';
import { CreateSchoolSubjectForm } from '@/features/admin/subjects/components/create-school-subject-form';
import { AdminSubjectDetailShell } from '@/features/admin/subjects/components/admin-subject-detail-shell';
import { useT } from '@/features/i18n/locale-context';

export default function AdminSubjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const isNew = id === 'new';

  if (isNew) {
    return (
      <div className="admin-workspace">
        <Link href="/admin/subjects" className="back-link">
          ‹ {t('nav.subjects')}
        </Link>
        <PageHeader title={t('admin.addSubject')} />
        <CreateSchoolSubjectForm
          onSaved={(sid) => router.push(`/admin/subjects/${sid}`)}
          onCancel={() => router.push('/admin/subjects')}
        />
      </div>
    );
  }

  return (
    <div className="admin-workspace">
      <AdminSubjectDetailShell subjectId={id} />
    </div>
  );
}
