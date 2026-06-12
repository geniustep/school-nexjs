'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { EntityAccountPanel } from '@/features/admin/account/entity-account-panel';
import { ParentForm } from '@/features/admin/entity-forms';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel, titleCase } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { Parent } from '@/types/parent';

export default function AdminParentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const state = useAdminResource<Parent>(isNew ? null : endpoints.admin.parent(id));

  if (isNew) {
    return (
      <>
        <Link href="/admin/parents" className="back-link">‹ {t('nav.parents')}</Link>
        <PageHeader title={t('admin.addParent')} />
        <ParentForm onSaved={(pid) => router.push(`/admin/parents/${pid}`)} onCancel={() => router.push('/admin/parents')} />
      </>
    );
  }

  return (
    <>
      <Link href="/admin/parents" className="back-link">‹ {t('nav.parents')}</Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(parent) => (
          <>
            <PageHeader
              title={parent.name}
              subtitle={parent.relation ? titleCase(parent.relation) : undefined}
              actions={
                <div className="row" style={{ gap: 8 }}>
                  <Badge tone={parent.status === 'active' ? 'green' : 'slate'}>{statusLabel(t, parent.status)}</Badge>
                  {!editing && parent.status !== 'archived' && (
                    <>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>{t('common.edit')}</button>
                      <ConfirmActionButton label={t('admin.archive')} confirmMessage={t('admin.confirmArchive')} path={endpoints.admin.parentArchive(parent.id)} variant="danger" onSuccess={() => router.push('/admin/parents')} />
                    </>
                  )}
                </div>
              }
            />
            {editing ? (
              <ParentForm parent={parent} onSaved={() => { setEditing(false); state.reload(); }} onCancel={() => setEditing(false)} />
            ) : (
              <div className="grid grid--cards">
                <Card>
                  <SectionHead title={t('admin.contact')} />
                  <DefinitionList items={[
                    { label: t('admin.phone'), value: parent.phone ?? t('common.dash') },
                    { label: t('admin.email'), value: parent.email ?? t('common.dash') },
                    { label: t('admin.relation'), value: parent.relation ? titleCase(parent.relation) : t('common.dash') },
                    { label: t('admin.preferredLanguage'), value: parent.preferred_language ?? t('common.dash') },
                    { label: t('admin.notificationOptIn'), value: parent.notification_opt_in ? t('common.yes') : t('common.no') },
                  ]} />
                </Card>
                <Card>
                  <SectionHead title={t('admin.account.accountInformation')} />
                  <EntityAccountPanel
                    entity={parent}
                    entityLabel={parent.name}
                    accountEndpoint={endpoints.admin.parentAccount(parent.id)}
                    managePermission="manage_parents"
                    defaultEmail={parent.email ?? ''}
                    onAccountChanged={() => state.reload()}
                  />
                </Card>
                <Card>
                  <SectionHead title={t('admin.linkedChildren')} />
                  {(parent.children ?? []).length ? (
                    <div className="col" style={{ gap: 10 }}>
                      {(parent.children ?? []).map((c) => (
                        <Link key={c.id} href={`/admin/students/${c.id}`} className="between row-link">
                          <span>{getStudentDisplayName(c)}</span>
                          <span className="tiny faint">{c.class?.name ?? t('common.dash')}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">{t('admin.noLinkedChildren')}</p>
                  )}
                </Card>
              </div>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
