'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader } from '@/components/ui/primitives';
import { AdminHomeworkDetailPanel } from '@/features/admin/admin-homework-detail';
import { HomeworkForm } from '@/features/admin/academic-forms';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { HomeworkDetail } from '@/types/homework';

export default function AdminHomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const state = useResource<HomeworkDetail>(isNew ? null : endpoints.admin.homework(id));

  if (isNew) {
    return (
      <>
        <Link href="/admin/homeworks" className="back-link">‹ {t('academic.backToHomework')}</Link>
        <PageHeader title={t('admin.addHomework')} />
        <HomeworkForm onSaved={(hid) => router.push(`/admin/homeworks/${hid}`)} onCancel={() => router.push('/admin/homeworks')} />
      </>
    );
  }

  return (
    <>
      <Link href="/admin/homeworks" className="back-link">‹ {t('academic.backToHomework')}</Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(hw) => (
          <>
            <PageHeader
              title={hw.name}
              subtitle={hw.class?.name}
              actions={
                hw.state !== 'archived' && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing((v) => !v)}>
                    {editing ? t('common.cancel') : t('common.edit')}
                  </button>
                )
              }
            />
            {editing ? (
              <HomeworkForm
                homework={hw}
                onSaved={() => { setEditing(false); state.reload(); }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <AdminHomeworkDetailPanel hw={hw} onUpdated={() => state.reload()} />
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
