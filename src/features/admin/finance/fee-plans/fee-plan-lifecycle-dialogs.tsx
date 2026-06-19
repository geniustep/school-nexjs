'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { feePlanErrorMessageKey } from '@/features/admin/finance/fee-plans/fee-plan-errors';
import {
  feePlanAllowsAction,
  feePlanLifecycleErrorMessageKey,
  normalizeFeePlan,
  resolveFeePlanLifecycleErrorCode,
  suggestDuplicatePlanCode,
  suggestDuplicatePlanName,
} from '@/features/admin/finance/fee-plans/normalize-fee-plan';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { resolveAcademicYearName } from '@/lib/utils/academic-years';
import type { FeePlan } from '@/types/finance';

function lifecycleErrorMessage(t: (key: string) => string, code?: string, fallback?: string): string {
  const lifecycleCode = resolveFeePlanLifecycleErrorCode(code);
  if (lifecycleCode) return t(feePlanLifecycleErrorMessageKey(lifecycleCode));
  const planKey = feePlanErrorMessageKey(code);
  if (planKey) return t(planKey);
  return fallback ?? t('common.error');
}

export function FeePlanResetToDraftDialog({
  open,
  plan,
  onClose,
  onSuccess,
  title,
  body,
  confirmLabel,
}: {
  open: boolean;
  plan: FeePlan;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  body?: string;
  confirmLabel?: string;
}) {
  const t = useT();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setLoading(false);
  }, [open]);

  async function confirm() {
    if (loading || !feePlanAllowsAction(plan, 'reset_to_draft')) return;
    setLoading(true);
    const res = await api.post<FeePlan>(endpoints.admin.financeFeePlanResetToDraft(plan.id));
    setLoading(false);
    if (res.success) {
      toast.success(t('admin.finance.feePlansWorkspace.resetToDraftSuccess'));
      onClose();
      onSuccess();
      return;
    }
    toast.error(lifecycleErrorMessage(t, res.error.code, res.error.message));
  }

  return (
    <ConfirmationDialog
      open={open}
      title={title ?? t('admin.finance.feePlansWorkspace.resetToDraft')}
      body={body ?? t('admin.finance.feePlansWorkspace.resetToDraftConfirm')}
      loading={loading}
      confirmLabel={confirmLabel ?? t('admin.finance.feePlansWorkspace.resetToDraft')}
      onConfirm={confirm}
      onClose={onClose}
    />
  );
}

export function FeePlanRestoreDialog({
  open,
  plan,
  onClose,
  onSuccess,
}: {
  open: boolean;
  plan: FeePlan;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setLoading(false);
  }, [open]);

  async function confirm() {
    if (loading || !feePlanAllowsAction(plan, 'restore')) return;
    setLoading(true);
    const res = await api.post<FeePlan>(endpoints.admin.financeFeePlanRestore(plan.id));
    setLoading(false);
    if (res.success) {
      toast.success(t('admin.finance.feePlansWorkspace.restoreSuccess'));
      onClose();
      onSuccess();
      return;
    }
    toast.error(lifecycleErrorMessage(t, res.error.code, res.error.message));
  }

  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.finance.feePlansWorkspace.restorePlan')}
      body={t('admin.finance.feePlansWorkspace.restoreConfirm')}
      loading={loading}
      confirmLabel={t('admin.finance.feePlansWorkspace.restorePlan')}
      onConfirm={confirm}
      onClose={onClose}
    />
  );
}

export function FeePlanDuplicateDialog({
  open,
  plan,
  onClose,
  onDuplicated,
}: {
  open: boolean;
  plan: FeePlan;
  onClose: () => void;
  onDuplicated: (newPlanId: number) => void;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { options: yearOptions } = useAcademicYearOptions(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');

  const yearLabel = useMemo(
    () =>
      resolveAcademicYearName(plan, yearOptions) ??
      (plan.academic_year_id ? String(plan.academic_year_id) : ''),
    [plan, yearOptions],
  );

  useEffect(() => {
    if (!open) {
      setLoading(false);
      return;
    }
    setName(suggestDuplicatePlanName(plan.name));
    setCode(suggestDuplicatePlanCode(plan.code));
    setAcademicYearId(plan.academic_year_id ? String(plan.academic_year_id) : '');
  }, [open, plan]);

  async function confirm() {
    if (loading || !feePlanAllowsAction(plan, 'duplicate')) return;
    const trimmedName = name.trim();
    const yearId = Number(academicYearId);
    if (!trimmedName || !Number.isFinite(yearId) || yearId <= 0) {
      toast.error(t('admin.finance.feePlansWorkspace.duplicateValidation'));
      return;
    }
    setLoading(true);
    const res = await api.post<FeePlan>(endpoints.admin.financeFeePlanDuplicate(plan.id), {
      name: trimmedName,
      academic_year_id: yearId,
      code: code.trim() || undefined,
    });
    setLoading(false);
    if (res.success) {
      const created = normalizeFeePlan(res.data);
      toast.success(t('admin.finance.feePlansWorkspace.duplicateSuccess'));
      onClose();
      if (created?.id) {
        onDuplicated(created.id);
        router.push(`/admin/finance/fee-plans/${created.id}`);
      }
      return;
    }
    toast.error(lifecycleErrorMessage(t, res.error.code, res.error.message));
  }

  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.finance.feePlansWorkspace.copyPlan')}
      body={
        <div className="fee-plan-duplicate-dialog">
          <p className="muted">{t('admin.finance.feePlansWorkspace.duplicateHint')}</p>
          <label className="field">
            <span>{t('admin.finance.planName')}</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('admin.finance.feePlansWorkspace.duplicateNamePlaceholder', {
                name: plan.name,
              })}
            />
          </label>
          <label className="field">
            <span>{t('admin.finance.academicYear')}</span>
            <select
              className="input"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
            >
              <option value="">{t('admin.finance.feePlansWorkspace.selectLevel')}</option>
              {yearOptions.map((year) => (
                <option key={year.id} value={String(year.id)}>
                  {year.name}
                </option>
              ))}
            </select>
            {yearLabel ? (
              <span className="muted fee-plan-duplicate-dialog__hint">
                {t('admin.finance.feePlansWorkspace.duplicateSourceYear', { year: yearLabel })}
              </span>
            ) : null}
          </label>
          <label className="field">
            <span>{t('admin.finance.feeTypeCode')}</span>
            <input
              className="input mono"
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
        </div>
      }
      size="form"
      loading={loading}
      confirmLabel={t('admin.finance.feePlansWorkspace.copyPlan')}
      onConfirm={confirm}
      onClose={onClose}
    />
  );
}

export function FeePlanDeleteDialog({
  open,
  plan,
  onClose,
  onDeleted,
  onArchiveInstead,
}: {
  open: boolean;
  plan: FeePlan;
  onClose: () => void;
  onDeleted: () => void;
  onArchiveInstead?: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const canArchiveInstead = feePlanAllowsAction(plan, 'archive');

  useEffect(() => {
    if (!open) {
      setConfirmName('');
      setLoading(false);
      setBlockedMessage(null);
    }
  }, [open]);

  const nameMatches = confirmName.trim() === plan.name.trim();

  async function confirm() {
    if (loading || !feePlanAllowsAction(plan, 'delete') || !nameMatches) return;
    setLoading(true);
    setBlockedMessage(null);
    const res = await api.delete(endpoints.admin.financeFeePlan(plan.id));
    setLoading(false);
    if (res.success) {
      toast.success(t('admin.finance.feePlansWorkspace.deleteSuccess'));
      onClose();
      onDeleted();
      router.push('/admin/finance/fee-plans');
      return;
    }
    const code = res.error.code;
    if (
      code === 'fee_plan_in_use' ||
      code === 'fee_plan_delete_forbidden_state' ||
      resolveFeePlanLifecycleErrorCode(code) === 'fee_plan_in_use'
    ) {
      setBlockedMessage(t('admin.finance.feePlansWorkspace.deleteInUseMessage'));
      return;
    }
    toast.error(lifecycleErrorMessage(t, code, res.error.message));
  }

  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.finance.feePlansWorkspace.deletePlanTitle')}
      body={
        <div className="fee-plan-delete-dialog">
          <p>{t('admin.finance.feePlansWorkspace.deletePlanMessage')}</p>
          <p className="muted">{t('admin.finance.feePlansWorkspace.deletePlanHint')}</p>
          <label className="fee-plan-delete-dialog__confirm">
            <span>{t('admin.finance.feePlansWorkspace.deleteConfirmName')}</span>
            <input
              className="input"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {blockedMessage ? (
            <div className="fee-plan-delete-dialog__blocked">
              <p className="form-error">{blockedMessage}</p>
              <p className="muted">{t('admin.finance.feePlansWorkspace.deleteUseArchiveInstead')}</p>
              {canArchiveInstead && onArchiveInstead ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    onClose();
                    onArchiveInstead();
                  }}
                >
                  {t('admin.finance.feePlansWorkspace.archive')}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      }
      variant="danger"
      size="form"
      loading={loading}
      confirmLabel={t('admin.finance.feePlansWorkspace.deletePlan')}
      onConfirm={confirm}
      onClose={onClose}
    />
  );
}

export function FeePlanDuplicateSuccessBanner({
  planId,
  onDismiss,
}: {
  planId: number;
  onDismiss: () => void;
}) {
  const t = useT();
  return (
    <div className="fee-plan-duplicate-success card" role="status">
      <p>{t('admin.finance.feePlansWorkspace.duplicateOpenHint')}</p>
      <div className="fee-plan-duplicate-success__actions">
        <Link href={`/admin/finance/fee-plans/${planId}`} className="btn btn--primary btn--sm">
          {t('admin.finance.feePlansWorkspace.openDuplicatedPlan')}
        </Link>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss}>
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
