'use client';

import Link from 'next/link';
import { useLocale } from '@/features/i18n/locale-context';
import { localeToBcp47 } from '@/lib/i18n/config';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { Badge, Card, PageHeader } from '@/components/ui/primitives';
import type { AdminRequest, AdminRequestRole, AdminRequestList } from '../types';
import {
  adminRequestApiBase,
  adminRequestUiBase,
  requestRows,
  requestTitle,
} from '../types';
import { adminRequestMessage, type AdminRequestMessageKey } from '../i18n';
import { adminRequestStateLabel } from '../presenters';

function copyKeys(role: AdminRequestRole): {
  title: AdminRequestMessageKey;
  subtitle: AdminRequestMessageKey;
  empty: AdminRequestMessageKey;
} {
  if (role === 'admin') {
    return { title: 'list.adminTitle', subtitle: 'list.subtitleAdmin', empty: 'list.emptyAdmin' };
  }
  if (role === 'staff') {
    return { title: 'list.staffTitle', subtitle: 'list.subtitleStaff', empty: 'list.emptyStaff' };
  }
  return { title: 'list.familyTitle', subtitle: 'list.subtitleFamily', empty: 'list.emptyFamily' };
}

export function AdminRequestListPage({ role }: { role: AdminRequestRole }) {
  const { locale } = useLocale();
  const apiBase = adminRequestApiBase(role);
  const uiBase = adminRequestUiBase(role);
  const state = useResource<AdminRequest[] | AdminRequestList>(apiBase, undefined, { keepPreviousData: false });
  const copy = copyKeys(role);
  const canCreate = role === 'parent' || role === 'student';
  const dateLocale = localeToBcp47(locale);

  return (
    <>
      <PageHeader
        title={adminRequestMessage(locale, copy.title)}
        subtitle={adminRequestMessage(locale, copy.subtitle)}
        actions={canCreate ? (
          <Link href={`${uiBase}/new`} className="btn btn--primary">
            {adminRequestMessage(locale, 'list.new')}
          </Link>
        ) : undefined}
      />
      <ResourceView
        state={state}
        isEmpty={(data) => requestRows(data).length === 0}
        empty={<Card>{adminRequestMessage(locale, copy.empty)}</Card>}
      >
        {(data) => (
          <div className="grid grid--cards">
            {requestRows(data).map((request: AdminRequest) => {
              const createdAt = request.created_at ?? request.create_date;
              return (
                <Link key={request.id} href={`${uiBase}/${request.id}`} className="row-link">
                  <Card>
                    <div className="between">
                      <strong dir="auto">{requestTitle(request)}</strong>
                      <Badge tone="blue">{adminRequestStateLabel(request.state, locale)}</Badge>
                    </div>
                    <p className="muted tiny" dir="auto">{request.reference ?? `#${request.id}`}</p>
                    {request.assigned?.name && (
                      <p className="muted tiny" dir="auto">
                        {adminRequestMessage(locale, 'list.currentAssignee', { name: request.assigned.name })}
                      </p>
                    )}
                    {createdAt && (
                      <p className="muted tiny">
                        {new Date(createdAt).toLocaleDateString(dateLocale)}
                      </p>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </ResourceView>
    </>
  );
}
