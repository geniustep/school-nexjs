'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Card } from '@/components/ui/primitives';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { LevelForm, type LevelDetail } from '@/features/admin/entity-forms';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';

export default function AdminLevelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const state = useResource<LevelDetail>(isNew ? null : endpoints.admin.level(id));

  if (isNew) {
    return (
      <>
        <Link href="/admin/levels" className="back-link">‹ {t('nav.levels')}</Link>
        <PageHeader title={t('admin.addLevel')} />
        <LevelForm onSaved={(lid) => router.push(`/admin/levels/${lid}`)} onCancel={() => router.push('/admin/levels')} />
      </>
    );
  }

  return (
    <>
      <Link href="/admin/levels" className="back-link">‹ {t('nav.levels')}</Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(level) => (
          <>
            <PageHeader
              title={level.name}
              actions={
                !editing && level.status !== 'archived' ? (
                  <div className="row" style={{ gap: 8 }}>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>{t('common.edit')}</button>
                    <ConfirmActionButton label={t('admin.archive')} confirmMessage={t('admin.confirmArchive')} path={endpoints.admin.levelArchive(level.id)} variant="danger" onSuccess={() => router.push('/admin/levels')} />
                  </div>
                ) : undefined
              }
            />
            {editing ? (
              <LevelForm level={level} onSaved={() => { setEditing(false); state.reload(); }} onCancel={() => setEditing(false)} />
            ) : (
              <Card>
                <p className="muted">{level.code ?? t('common.dash')} · {level.category ?? t('common.dash')}</p>
              </Card>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
