'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { DataTable, type Column } from '@/components/tables/data-table';
import { Badge } from '@/components/ui/primitives';
import { EmptyState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import {
  admissionStateTone,
  formatAdmissionReference,
  isOverdueNextAction,
  refName,
} from '../utils/admission-labels';
import type { AdmissionListItem } from '@/types/admission';

export function AdmissionsTable({ items }: { items: AdmissionListItem[] }) {
  const t = useT();

  const columns: Column<AdmissionListItem>[] = useMemo(
    () => [
      {
        key: 'reference',
        header: t('admin.admissions.table.reference'),
        render: (row) => (
          <Link href={`/admin/admissions/${row.id}`} className="mono">
            {formatAdmissionReference(row.id, row.reference)}
          </Link>
        ),
      },
      {
        key: 'student_name',
        header: t('admin.admissions.table.student'),
        render: (row) => (
          <Link href={`/admin/admissions/${row.id}`}>
            <strong>{row.student_name}</strong>
          </Link>
        ),
      },
      {
        key: 'guardian_name',
        header: t('admin.admissions.table.guardian'),
        render: (row) => row.guardian_name ?? '—',
      },
      {
        key: 'guardian_phone',
        header: t('admin.admissions.table.phone'),
        render: (row) => (
          <span dir="ltr">{row.guardian_phone ?? '—'}</span>
        ),
      },
      {
        key: 'source',
        header: t('admin.admissions.table.source'),
        render: (row) => refName(row.source) || '—',
      },
      {
        key: 'requested_level',
        header: t('admin.admissions.table.level'),
        render: (row) => refName(row.requested_level) || '—',
      },
      {
        key: 'state',
        header: t('admin.admissions.table.state'),
        render: (row) => (
          <Badge tone={admissionStateTone(row.state)}>
            {t(`admin.admissions.states.${row.state}`)}
          </Badge>
        ),
      },
      {
        key: 'next_action',
        header: t('admin.admissions.table.nextAction'),
        render: (row) => {
          if (!row.next_action && !row.next_action_date) return '—';
          const overdue = isOverdueNextAction(row.next_action_date);
          return (
            <span className={overdue ? 'text-danger' : undefined}>
              {[row.next_action, row.next_action_date].filter(Boolean).join(' · ')}
            </span>
          );
        },
      },
      {
        key: 'assigned_user',
        header: t('admin.admissions.table.assigned'),
        render: (row) => refName(row.assigned_user) || '—',
      },
    ],
    [t],
  );

  if (!items.length) {
    return (
      <EmptyState
        icon="📋"
        title={t('admin.admissions.empty.title')}
        description={t('admin.admissions.empty.description')}
      />
    );
  }

  return (
    <div className="admissions-list-table">
      <DataTable columns={columns} rows={items} rowKey={(row) => row.id} />
    </div>
  );
}
