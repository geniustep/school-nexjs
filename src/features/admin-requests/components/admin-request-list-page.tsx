'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { Badge, Card, PageHeader } from '@/components/ui/primitives';
import type { AdminRequest, AdminRequestRole, AdminRequestList } from '../types';
import { requestRows, requestTitle } from '../types';

const LABEL: Record<AdminRequestRole, { title: string; newLabel: string; empty: string }> = {
  parent: { title: 'طلباتي الإدارية', newLabel: 'طلب جديد', empty: 'لا توجد طلبات بعد.' },
  student: { title: 'طلباتي الإدارية', newLabel: 'طلب جديد', empty: 'لا توجد طلبات بعد.' },
  admin: { title: 'الطلبات الإدارية', newLabel: '', empty: 'لا توجد طلبات ضمن هذا النطاق.' },
};

function requestPath(role: AdminRequestRole, id: number) {
  return `/${role}/admin-requests/${id}`;
}

export function AdminRequestListPage({ role }: { role: AdminRequestRole }) {
  const base = role === 'admin' ? '/admin/admin-requests' : `/${role}/admin-requests`;
  const state = useResource<AdminRequest[] | AdminRequestList>(base, undefined, { keepPreviousData: false });
  const copy = LABEL[role];

  return (
    <>
      <PageHeader
        title={copy.title}
        subtitle={role === 'admin' ? 'المعالجة داخل نطاق المؤسسة الحالي.' : 'تابع طلباتك وتواصل مع الإدارة عند الحاجة.'}
        actions={role !== 'admin' ? <Link href={`${base}/new`} className="btn btn--primary">{copy.newLabel}</Link> : undefined}
      />
      <ResourceView state={state} isEmpty={(data) => requestRows(data).length === 0} empty={<Card>{copy.empty}</Card>}>
        {(data) => (
          <div className="grid grid--cards">
            {requestRows(data).map((request: AdminRequest) => (
              <Link key={request.id} href={requestPath(role, request.id)} className="row-link">
                <Card>
                  <div className="between">
                    <strong>{requestTitle(request)}</strong>
                    <Badge tone="blue">{request.state}</Badge>
                  </div>
                  <p className="muted tiny">{request.reference ?? `#${request.id}`}</p>
                  {request.created_at && <p className="muted tiny">{new Date(request.created_at).toLocaleDateString()}</p>}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
