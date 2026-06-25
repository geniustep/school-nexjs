'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { DataTable, type Column } from '@/components/tables/data-table';
import { EmptyState } from '@/components/states/states';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import {
  cleanDisplayValue,
  formatAdmissionReference,
  isOverdueNextAction,
  refName,
} from '../utils/admission-labels';
import { AdmissionCard } from './admission-card';
import { AdmissionStateSelect } from './admission-state-select';
import { parseExtraFieldBool } from '../utils/admission-extra-fields';
import { isAdmissionConvertedToStudent } from '../utils/admission-registration';
import { Badge } from '@/components/ui/primitives';
import type { AdmissionListItem } from '@/types/admission';

export function AdmissionsTable({
  items,
  onUpdated,
}: {
  items: AdmissionListItem[];
  onUpdated?: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();

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
        render: (row) => {
          const name = cleanDisplayValue(row.student_name);
          const externalRef = cleanDisplayValue(row.external_reference ?? '');
          const hasSiblings = parseExtraFieldBool(row.has_siblings);
          return (
            <Link href={`/admin/admissions/${row.id}`} className="admissions-table__student-link">
              <strong>{name || t('common.dash')}</strong>
              {externalRef ? (
                <span className="admissions-table__external-ref tiny muted mono" dir="ltr">
                  {externalRef}
                </span>
              ) : null}
              {hasSiblings ? (
                <span className="admissions-table__siblings-hint tiny muted">
                  {t('admin.admissions.list.hasSiblingsBadge')}
                </span>
              ) : null}
            </Link>
          );
        },
      },
      {
        key: 'guardian_name',
        header: t('admin.admissions.table.guardian'),
        render: (row) => cleanDisplayValue(row.guardian_name) || t('common.dash'),
      },
      {
        key: 'guardian_phone',
        header: t('admin.admissions.table.phone'),
        render: (row) => {
          const phone = cleanDisplayValue(row.guardian_phone);
          return phone ? <span dir="ltr">{phone}</span> : t('common.dash');
        },
      },
      {
        key: 'source',
        header: t('admin.admissions.table.source'),
        render: (row) => refName(row.source) || t('common.dash'),
      },
      {
        key: 'requested_level',
        header: t('admin.admissions.table.level'),
        render: (row) => refName(row.requested_level) || t('common.dash'),
      },
      {
        key: 'state',
        header: t('admin.admissions.table.state'),
        render: (row) =>
          isAdmissionConvertedToStudent(row) ? (
            <span className="admissions-table__converted">
              <Badge tone="green">{t('admin.admissions.registration.convertedBadge')}</Badge>
              <span className="admissions-table__converted-note tiny muted">
                {t('admin.admissions.registration.convertedBadgePrevState', {
                  state: t(`admin.admissions.states.${row.state}`),
                })}
              </span>
            </span>
          ) : (
            <AdmissionStateSelect
              admissionId={row.id}
              value={row.state}
              onChanged={onUpdated}
              className="admission-state-select--table"
            />
          ),
      },
      {
        key: 'next_action',
        header: t('admin.admissions.table.nextAction'),
        render: (row) => {
          const action = cleanDisplayValue(row.next_action);
          const date = row.next_action_date ? formatDate(row.next_action_date) : '';
          const line = [action, date].filter(Boolean).join(' · ');
          if (!line) return t('common.dash');
          const overdue = isOverdueNextAction(row.next_action_date);
          return <span className={overdue ? 'text-danger' : undefined}>{line}</span>;
        },
      },
      {
        key: 'assigned_user',
        header: t('admin.admissions.table.assigned'),
        render: (row) => refName(row.assigned_user) || t('common.dash'),
      },
    ],
    [formatDate, t, onUpdated],
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
    <>
      <div className="admissions-list-table admissions-table__desktop">
        <DataTable columns={columns} rows={items} rowKey={(row) => row.id} />
      </div>
      <div className="admissions-table__mobile" aria-label={t('admin.admissions.viewTable')}>
        {items.map((item) => (
          <AdmissionCard key={item.id} item={item} showStateBadge />
        ))}
      </div>
    </>
  );
}
