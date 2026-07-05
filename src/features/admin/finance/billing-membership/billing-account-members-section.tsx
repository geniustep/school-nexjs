'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { FinanceStudentSearch } from '@/features/admin/finance/finance-student-search';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { TransferPreviewDialog } from '@/features/admin/finance/billing-membership/transfer-preview-dialog';
import { addBillingAccountMember, endBillingAccountMember } from '@/lib/finance/billing-membership-api';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { canManageBillingMembership } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import {
  billingMembershipErrorMessageKey,
  isMembershipConflictError,
  memberAllowsEnd,
  memberAllowsTransferOut,
  normalizeBillingAccountMembers,
  validateMembershipReason,
} from '@/lib/utils/normalize-billing-membership';
import { financeStudentDisplayName } from '@/lib/utils/finance';
import type { FinanceStudentSearchResult } from '@/types/finance';
import type { BillingAccountMemberRow } from '@/types/finance-billing-membership';

type TransferPreviewContext = {
  studentId: number;
  studentName: string;
  reason: string;
  startDate: string;
  activeMembershipPartnerId?: number | null;
};

function AddMemberDialog({
  billingPartnerId,
  open,
  onClose,
  onSuccess,
  onOpenTransferPreview,
}: {
  billingPartnerId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenTransferPreview: (context: TransferPreviewContext) => void;
}) {
  const t = useT();
  const toast = useToast();
  const submittedRef = useRef(false);
  const [selectedStudent, setSelectedStudent] = useState<FinanceStudentSearchResult | null>(null);
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [conflictVisible, setConflictVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedStudent(null);
      setReason('');
      setStartDate('');
      setReasonError(null);
      setStudentError(null);
      setConflictVisible(false);
      setSubmitting(false);
      submittedRef.current = false;
    }
  }, [open, billingPartnerId]);

  if (!open) return null;

  async function submitAdd() {
    if (submitting || submittedRef.current) return;

    if (!selectedStudent) {
      setStudentError(t('admin.finance.billingAccounts.members.add.selectStudentRequired'));
      return;
    }
    if (!validateMembershipReason(reason)) {
      setReasonError(t('admin.finance.billingAccounts.members.add.reasonRequired'));
      return;
    }

    submittedRef.current = true;
    setSubmitting(true);
    const res = await addBillingAccountMember(billingPartnerId, {
      student_id: selectedStudent.id,
      reason: reason.trim(),
      start_date: startDate.trim() || null,
    });
    setSubmitting(false);

    if (res.success) {
      toast.success(t('admin.finance.billingAccounts.members.add.success'));
      onSuccess();
      onClose();
      return;
    }

    submittedRef.current = false;
    if (isMembershipConflictError(res.error)) {
      setConflictVisible(true);
      return;
    }

    const status =
      typeof res.error?.details?.status === 'number' ? res.error.details.status : undefined;
    toast.error(t(billingMembershipErrorMessageKey(res.error?.code, status)));
  }

  function openPreviewFromConflict() {
    if (!selectedStudent || !validateMembershipReason(reason)) {
      setReasonError(t('admin.finance.billingAccounts.members.add.reasonRequired'));
      return;
    }
    onOpenTransferPreview({
      studentId: selectedStudent.id,
      studentName: financeStudentDisplayName(selectedStudent),
      reason: reason.trim(),
      startDate: startDate.trim(),
    });
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={submitting ? undefined : onClose}>
      <div
        className="card modal-panel modal-panel--form billing-membership-dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('admin.finance.billingAccounts.members.add.title')}</h3>

        {selectedStudent ? (
          <div className="billing-membership-dialog__selected" dir="auto">
            <strong>{financeStudentDisplayName(selectedStudent)}</strong>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={submitting}
              onClick={() => {
                setSelectedStudent(null);
                setConflictVisible(false);
              }}
            >
              {t('admin.finance.billingAccounts.members.add.changeStudent')}
            </button>
          </div>
        ) : (
          <FinanceStudentSearch compact onSelect={setSelectedStudent} showProfileLink={false} />
        )}
        {studentError ? <span className="form-error">{studentError}</span> : null}

        <label className="billing-membership-dialog__field">
          <span>
            {t('admin.finance.billingAccounts.members.add.reasonLabel')}
            <span className="billing-membership-dialog__required" aria-hidden>
              {' '}
              *
            </span>
          </span>
          <textarea
            className="input"
            rows={3}
            value={reason}
            disabled={submitting}
            aria-invalid={reasonError ? true : undefined}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonError) setReasonError(null);
            }}
          />
          {reasonError ? <span className="form-error">{reasonError}</span> : null}
        </label>

        <label className="billing-membership-dialog__field">
          <span>{t('admin.finance.billingAccounts.members.add.startDateLabel')}</span>
          <input
            className="input"
            type="date"
            value={startDate}
            disabled={submitting}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        {conflictVisible ? (
          <div className="billing-membership-dialog__conflict" role="alert">
            <p>{t('admin.finance.billingAccounts.members.add.conflictMessage')}</p>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={submitting}
              onClick={openPreviewFromConflict}
            >
              {t('admin.finance.billingAccounts.members.preview.openFromConflict')}
            </button>
          </div>
        ) : null}

        <div className="billing-membership-dialog__actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={submitting || conflictVisible}
            onClick={submitAdd}
          >
            {submitting ? t('common.submitting') : t('common.confirm')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

function EndMembershipDialog({
  billingPartnerId,
  member,
  open,
  onClose,
  onSuccess,
}: {
  billingPartnerId: number;
  member: BillingAccountMemberRow;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const submittedRef = useRef(false);
  const [reason, setReason] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setEndDate('');
      setReasonError(null);
      setSubmitting(false);
      submittedRef.current = false;
    }
  }, [open, member.student_id]);

  if (!open) return null;

  async function submit() {
    if (submitting || submittedRef.current) return;
    if (!validateMembershipReason(reason)) {
      setReasonError(t('admin.finance.billingAccounts.members.end.reasonRequired'));
      return;
    }

    submittedRef.current = true;
    setSubmitting(true);
    const res = await endBillingAccountMember(billingPartnerId, member.student_id, {
      reason: reason.trim(),
      end_date: endDate.trim() || null,
    });
    setSubmitting(false);

    if (res.success) {
      toast.success(t('admin.finance.billingAccounts.members.end.success'));
      onSuccess();
      onClose();
      return;
    }

    submittedRef.current = false;
    const status =
      typeof res.error?.details?.status === 'number' ? res.error.details.status : undefined;
    toast.error(t(billingMembershipErrorMessageKey(res.error?.code, status)));
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={submitting ? undefined : onClose}>
      <div
        className="card modal-panel modal-panel--form billing-membership-dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('admin.finance.billingAccounts.members.end.title')}</h3>
        <p className="muted" dir="auto">
          {member.student_name ?? `#${member.student_id}`}
        </p>

        <label className="billing-membership-dialog__field">
          <span>
            {t('admin.finance.billingAccounts.members.end.reasonLabel')}
            <span className="billing-membership-dialog__required" aria-hidden>
              {' '}
              *
            </span>
          </span>
          <textarea
            className="input"
            rows={3}
            value={reason}
            disabled={submitting}
            aria-invalid={reasonError ? true : undefined}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonError) setReasonError(null);
            }}
          />
          {reasonError ? <span className="form-error">{reasonError}</span> : null}
        </label>

        <label className="billing-membership-dialog__field">
          <span>{t('admin.finance.billingAccounts.members.end.endDateLabel')}</span>
          <input
            className="input"
            type="date"
            value={endDate}
            disabled={submitting}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>

        <div className="billing-membership-dialog__actions">
          <button
            type="button"
            className="btn btn--danger btn--sm"
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? t('common.submitting') : t('admin.finance.billingAccounts.members.end.confirm')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BillingAccountMembersSection({
  billingPartnerId,
  academicYearId,
  onMembershipChanged,
}: {
  billingPartnerId: number;
  academicYearId?: number | null;
  onMembershipChanged?: () => void;
}) {
  const t = useT();
  const user = useSession();
  const { formatDate } = useFormat();
  const state = useAdminResource<unknown>(endpoints.admin.financeBillingAccountMembers(billingPartnerId));
  const payload = useMemo(() => normalizeBillingAccountMembers(state.data), [state.data]);
  const members = payload?.members ?? [];
  const canManage = canManageBillingMembership(user);
  const [addOpen, setAddOpen] = useState(false);
  const [endMember, setEndMember] = useState<BillingAccountMemberRow | null>(null);
  const [previewContext, setPreviewContext] = useState<TransferPreviewContext | null>(null);

  const refreshAll = () => {
    state.reload();
    onMembershipChanged?.();
  };

  const openTransferPreview = (member: BillingAccountMemberRow) => {
    setPreviewContext({
      studentId: member.student_id,
      studentName: member.student_name ?? `#${member.student_id}`,
      reason: t('admin.finance.billingAccounts.members.preview.defaultReason'),
      startDate: member.membership_start_date ?? '',
      activeMembershipPartnerId: member.current_billing_partner_id ?? null,
    });
  };

  const columns: Column<BillingAccountMemberRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('nav.students'),
        render: (row) => <span dir="auto">{row.student_name ?? `#${row.student_id}`}</span>,
      },
      {
        key: 'class',
        header: t('admin.finance.billingAccounts.students.class'),
        render: (row) => <span dir="auto">{row.class_name ?? t('common.dash')}</span>,
      },
      {
        key: 'start',
        header: t('admin.finance.billingAccounts.members.columns.startDate'),
        render: (row) =>
          row.membership_start_date ? formatDate(row.membership_start_date) : t('common.dash'),
      },
      {
        key: 'status',
        header: t('admin.finance.billingAccounts.members.columns.status'),
        render: (row) => {
          const statusKey = row.status ? `admin.finance.billingAccounts.members.status.${row.status}` : '';
          const label = statusKey ? t(statusKey) : '';
          return (
            <span className="billing-membership-status" data-status={row.status ?? undefined}>
              {label !== statusKey ? label : (row.status_label ?? row.status ?? t('common.dash'))}
            </span>
          );
        },
      },
      {
        key: 'remaining',
        header: t('admin.finance.billingAccounts.metrics.remaining'),
        render: (row) => <FinanceMoney amount={row.total_remaining} currency={row.currency} />,
      },
      {
        key: 'overdue',
        header: t('admin.finance.billingAccounts.metrics.overdue'),
        render: (row) => <FinanceMoney amount={row.total_overdue} currency={row.currency} />,
      },
      {
        key: 'warnings',
        header: t('admin.finance.billingAccounts.members.columns.warnings'),
        render: (row) =>
          row.warnings?.length ? (
            <ul className="billing-membership-warnings">
              {row.warnings.map((warning, index) => (
                <li key={`${row.student_id}-${index}`} dir="auto">
                  {warning}
                </li>
              ))}
            </ul>
          ) : (
            t('common.dash')
          ),
      },
      {
        key: 'actions',
        header: t('admin.finance.billingAccounts.columns.actions'),
        render: (row) => {
          if (!canManageBillingMembership(user)) return t('common.dash');
          const actions = [];
          if (memberAllowsTransferOut(row)) {
            actions.push(
              <button
                key="preview"
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openTransferPreview(row);
                }}
              >
                {t('admin.finance.billingAccounts.members.preview.action')}
              </button>,
            );
          }
          if (memberAllowsEnd(row)) {
            actions.push(
              <button
                key="end"
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setEndMember(row);
                }}
              >
                {t('admin.finance.billingAccounts.members.end.action')}
              </button>,
            );
          }
          return actions.length ? <div className="billing-membership-row-actions">{actions}</div> : t('common.dash');
        },
      },
    ],
    [t, formatDate, user],
  );

  return (
    <section className="finance-billing-section billing-membership-section">
      <div className="billing-membership-section__head">
        <h2>{t('admin.finance.billingAccounts.members.title')}</h2>
        {canManage ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setAddOpen(true)}>
            {t('admin.finance.billingAccounts.members.add.action')}
          </button>
        ) : null}
      </div>

      {state.error ? (
        <ApiErrorView
          error={{
            code: state.error.code,
            message: t('admin.finance.billingAccounts.members.loadError'),
          }}
          onRetry={state.reload}
        />
      ) : null}

      {state.initialLoading ? <LoadingState label={t('common.loading')} /> : null}

      {!state.initialLoading && !state.error && !members.length ? (
        <EmptyState
          title={t('admin.finance.billingAccounts.members.emptyTitle')}
          description={t('admin.finance.billingAccounts.members.emptyDesc')}
        />
      ) : null}

      {!state.initialLoading && members.length ? (
        <DataTable columns={columns} rows={members} rowKey={(row) => row.student_id} />
      ) : null}

      <AddMemberDialog
        billingPartnerId={billingPartnerId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={refreshAll}
        onOpenTransferPreview={(context) => setPreviewContext(context)}
      />

      {endMember ? (
        <EndMembershipDialog
          billingPartnerId={billingPartnerId}
          member={endMember}
          open={!!endMember}
          onClose={() => setEndMember(null)}
          onSuccess={refreshAll}
        />
      ) : null}

      {previewContext ? (
        <TransferPreviewDialog
          billingPartnerId={billingPartnerId}
          studentId={previewContext.studentId}
          studentName={previewContext.studentName}
          reason={previewContext.reason}
          startDate={previewContext.startDate}
          academicYearId={academicYearId}
          activeMembershipPartnerId={previewContext.activeMembershipPartnerId}
          open={!!previewContext}
          canManage={canManage}
          onClose={() => setPreviewContext(null)}
          onApplied={refreshAll}
        />
      ) : null}
    </section>
  );
}
