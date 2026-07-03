'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { NotFoundState, PermissionDeniedState } from '@/components/states/states';
import { canCreateGuardians } from '@/lib/permissions/academic-capabilities';
import { useSession } from '@/features/auth/session-context';
import { PageHeader } from '@/components/ui/primitives';
import { ParentForm } from '@/features/admin/entity-forms';
import { ParentProfileView } from '@/features/admin/parents/components/parent-profile-view';
import { normalizeParentProfile } from '@/features/admin/parents/utils/normalize-parent-profile';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';

export default function AdminParentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const state = useAdminResource<unknown>(isNew ? null : endpoints.admin.parent(id));

  const parent = useMemo(
    () => (state.data ? normalizeParentProfile(state.data) : null),
    [state.data],
  );

  if (isNew) {
    if (!canCreateGuardians(user)) {
      return (
        <>
          <Link href="/admin/parents" className="back-link">
            ‹ {t('nav.parents')}
          </Link>
          <PermissionDeniedState description={t('admin.pageForbidden')} />
        </>
      );
    }
    return (
      <>
        <Link href="/admin/parents" className="back-link">
          ‹ {t('nav.parents')}
        </Link>
        <PageHeader title={t('admin.addParent')} />
        <ParentForm onSaved={(pid) => router.push(`/admin/parents/${pid}`)} onCancel={() => router.push('/admin/parents')} />
      </>
    );
  }

  if (state.error?.code === 'not_found') {
    return (
      <>
        <Link href="/admin/parents" className="back-link">
          ‹ {t('nav.parents')}
        </Link>
        <NotFoundState description={t('admin.parentProfile.notFound')} />
      </>
    );
  }

  return (
    <>
      <Link href="/admin/parents" className="back-link">
        ‹ {t('nav.parents')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {() =>
          parent ? (
            <>
              <PageHeader title={parent.display_name ?? parent.name} />
              <ParentProfileView
                parent={parent}
                editing={editing}
                onEdit={() => setEditing(true)}
                onCancelEdit={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false);
                  state.reload();
                }}
                onReload={() => state.reload()}
                relationshipsLoading={state.initialLoading}
                relationshipsError={state.error?.message ?? null}
              />
            </>
          ) : null
        }
      </ResourceView>
    </>
  );
}
