'use client';

import Link from 'next/link';
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
import { adminRequestStateLabel } from '../presenters';

const LABEL: Record<AdminRequestRole, { title: string; newLabel: string; empty: string }> = {
  parent: { title: 'طلباتي الإدارية', newLabel: 'طلب جديد', empty: 'لا توجد طلبات بعد.' },
  student: { title: 'طلباتي الإدارية', newLabel: 'طلب جديد', empty: 'لا توجد طلبات بعد.' },
  admin: { title: 'الطلبات الإدارية', newLabel: '', empty: 'لا توجد طلبات ضمن هذا النطاق.' },
  staff: { title: 'الطلبات المحالة إليّ', newLabel: '', empty: 'لا توجد طلبات محالة إليك حاليًا.' },
};

function subtitle(role: AdminRequestRole): string {
  if (role === 'admin') return 'راجع الطلبات واتخذ الإجراء المناسب مباشرة.';
  if (role === 'staff') return 'تظهر هنا فقط الطلبات الإدارية المحالة إليك.';
  return 'تابع طلباتك وتواصل مع الإدارة عند الحاجة.';
}

export function AdminRequestListPage({ role }: { role: AdminRequestRole }) {
  const apiBase = adminRequestApiBase(role);
  const uiBase = adminRequestUiBase(role);
  const state = useResource<AdminRequest[] | AdminRequestList>(apiBase, undefined, { keepPreviousData: false });
  const copy = LABEL[role];
  const canCreate = role === 'parent' || role === 'student';

  return (
    <>
      <PageHeader
        title={copy.title}
        subtitle={subtitle(role)}
        actions={canCreate ? <Link href={`${uiBase}/new`} className="btn btn--primary">{copy.newLabel}</Link> : undefined}
      />
      <ResourceView state={state} isEmpty={(data) => requestRows(data).length === 0} empty={<Card>{copy.empty}</Card>}>
        {(data) => (
          <div className="grid grid--cards">
            {requestRows(data).map((request: AdminRequest) => {
              const createdAt = request.created_at ?? request.create_date;
              return (
                <Link key={request.id} href={`${uiBase}/${request.id}`} className="row-link">
                  <Card>
                    <div className="between">
                      <strong>{requestTitle(request)}</strong>
                      <Badge tone="blue">{adminRequestStateLabel(request.state)}</Badge>
                    </div>
                    <p className="muted tiny">{request.reference ?? `#${request.id}`}</p>
                    {request.assigned?.name && (
                      <p className="muted tiny">المسؤول الحالي: {request.assigned.name}</p>
                    )}
                    {createdAt && <p className="muted tiny">{new Date(createdAt).toLocaleDateString('ar-MA')}</p>}
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
