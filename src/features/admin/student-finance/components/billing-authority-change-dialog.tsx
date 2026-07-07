'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { isRelationshipActive } from '@/features/admin/students/utils/relationship-types';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { StudentDetailsData } from '@/types/student-360';
import type {
  BillingAuthorityChangeBootstrap,
  BillingAuthorityTarget,
  NormalizedBillingAuthorityChangePreview,
} from '@/types/finance-billing-authority-change';
import {
  applyBillingAuthorityChange,
  fetchBillingAuthorityChangeBootstrap,
  previewBillingAuthorityChange,
} from '../api/billing-authority-change-api';
import {
  buildBillingAuthorityApplyRequest,
  buildBillingAuthorityPreviewRequest,
  canSubmitBillingAuthorityApply,
  canSubmitBillingAuthorityPreview,
  canSubmitBillingAuthorityReason,
  decodeBillingAuthorityTargetKey,
  encodeBillingAuthorityTargetKey,
  type BillingAuthorityTargetSelection,
} from '../utils/build-billing-authority-change-payload';
import { resolveBillingAuthorityChangeErrorMessage } from '../utils/billing-authority-change-errors';

function authorityLabel(
  authority: { name?: string | null; billing_party_type?: string | null },
  t: (key: string) => string,
): string {
  if (authority.name?.trim()) return authority.name.trim();
  if (authority.billing_party_type === 'student') {
    return t('admin.finance.billingPartyStudentSelf');
  }
  if (authority.billing_party_type === 'guardian') {
    return t('admin.finance.billingPartyGuardian');
  }
  return t('common.dash');
}

function buildFallbackTargets(details: StudentDetailsData): BillingAuthorityTarget[] {
  const studentName = getStudentDisplayName(details.student);
  const guardians = details.guardian_relationships
    .filter((rel) => isRelationshipActive(rel.state, rel.active))
    .map((rel) => ({
      billing_party_type: 'guardian' as const,
      guardian_id: rel.guardian.id,
      billing_partner_id: null,
      label: rel.guardian.name?.trim() || tFallbackGuardian(rel.guardian.id),
      is_current: false,
    }));
  return [
    ...guardians,
    {
      billing_party_type: 'student',
      label: studentName,
      is_self: true,
    },
  ];
}

function tFallbackGuardian(id: number): string {
  return `#${id}`;
}

function mergeEligibleTargets(
  bootstrap: BillingAuthorityChangeBootstrap | null,
  details: StudentDetailsData,
): BillingAuthorityTarget[] {
  const fromApi = bootstrap?.eligibleTargets ?? [];
  if (fromApi.length > 0) return fromApi;
  return buildFallbackTargets(details);
}

export function BillingAuthorityChangeDialog({
  open,
  studentId,
  details,
  currentAuthorityName,
  onClose,
  onSuccess,
}: {
  open: boolean;
  studentId: number;
  details: StudentDetailsData;
  currentAuthorityName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [bootstrap, setBootstrap] = useState<BillingAuthorityChangeBootstrap | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [targetKey, setTargetKey] = useState('');
  const [reason, setReason] = useState('');
  const [selfConfirmed, setSelfConfirmed] = useState(false);
  const [preview, setPreview] = useState<NormalizedBillingAuthorityChangePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const eligibleTargets = useMemo(
    () => mergeEligibleTargets(bootstrap, details),
    [bootstrap, details],
  );

  const guardianTargets = useMemo(
    () => eligibleTargets.filter((target) => target.billing_party_type === 'guardian' && !target.is_current),
    [eligibleTargets],
  );

  const selection = useMemo(
    () => decodeBillingAuthorityTargetKey(targetKey),
    [targetKey],
  );

  const isSelfSelection = selection?.kind === 'student';

  const resetForm = useCallback(() => {
    setTargetKey('');
    setReason('');
    setSelfConfirmed(false);
    setPreview(null);
    setFormError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (previewLoading || applyLoading) return;
    resetForm();
    onClose();
  }, [applyLoading, onClose, previewLoading, resetForm]);

  useEffect(() => {
    if (!open) return;
    resetForm();
    setBootstrap(null);
    setBootstrapError(null);
    setBootstrapLoading(true);
    void fetchBillingAuthorityChangeBootstrap(studentId).then((res) => {
      setBootstrapLoading(false);
      if (!res.success) {
        setBootstrapError(
          resolveBillingAuthorityChangeErrorMessage(res.error?.code, res.error?.message, t),
        );
        return;
      }
      setBootstrap(res.data);
    });
  }, [open, resetForm, studentId, t]);

  function invalidatePreview() {
    setPreview(null);
  }

  async function handlePreview() {
    if (!canSubmitBillingAuthorityPreview(selection)) {
      setFormError(t('admin.student360.financeWorkspace.billingAuthorityChange.errors.targetRequired'));
      return;
    }
    setPreviewLoading(true);
    setFormError(null);
    const res = await previewBillingAuthorityChange(
      studentId,
      buildBillingAuthorityPreviewRequest(selection!),
    );
    setPreviewLoading(false);
    if (!res.success) {
      setFormError(resolveBillingAuthorityChangeErrorMessage(res.error?.code, res.error?.message, t));
      return;
    }
    setPreview(res.data);
  }

  async function handleApply() {
    if (!preview || !selection) return;
    if (!canSubmitBillingAuthorityApply({
      previewToken: preview.previewToken,
      reason,
      selection,
      confirmed: selfConfirmed,
      canApply: preview.canApply,
    })) {
      if (!canSubmitBillingAuthorityReason(reason)) {
        setFormError(t('admin.student360.financeWorkspace.billingAuthorityChange.errors.reasonRequired'));
        return;
      }
      if (isSelfSelection && !selfConfirmed) {
        setFormError(
          t('admin.student360.financeWorkspace.billingAuthorityChange.errors.confirmationRequired'),
        );
        return;
      }
      setFormError(t('admin.student360.financeWorkspace.billingAuthorityChange.errors.applyBlocked'));
      return;
    }
    setApplyLoading(true);
    setFormError(null);
    const res = await applyBillingAuthorityChange(
      studentId,
      buildBillingAuthorityApplyRequest({
        previewToken: preview.previewToken!,
        reason,
        selection,
        confirmed: selfConfirmed,
      }),
    );
    setApplyLoading(false);
    if (!res.success) {
      setFormError(resolveBillingAuthorityChangeErrorMessage(res.error?.code, res.error?.message, t));
      return;
    }
    toast.success(t('admin.student360.financeWorkspace.billingAuthorityChange.success'));
    resetForm();
    onClose();
    onSuccess();
  }

  if (!open) return null;

  const currentName =
    bootstrap?.currentAuthority?.name?.trim() ||
    currentAuthorityName ||
    authorityLabel(bootstrap?.currentAuthority ?? {}, t);

  const previewCurrency = preview?.currency ?? undefined;
  const canApply = canSubmitBillingAuthorityApply({
    previewToken: preview?.previewToken,
    reason,
    selection,
    confirmed: selfConfirmed,
    canApply: preview?.canApply === true,
  });

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleClose}>
      <div
        className="card modal-panel modal-panel--form billing-authority-change-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-authority-change-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="billing-authority-change-dialog__head">
          <h3 id="billing-authority-change-title">
            {t('admin.student360.financeWorkspace.billingAuthorityChange.dialogTitle')}
          </h3>
          <p className="tiny muted">
            {t('admin.student360.financeWorkspace.billingAuthorityChange.dialogIntro')}
          </p>
        </header>

        {bootstrapLoading ? (
          <p className="muted">{t('common.loading')}</p>
        ) : null}
        {bootstrapError ? (
          <p className="form-error" role="alert">
            {bootstrapError}
          </p>
        ) : null}

        <div className="billing-authority-change-dialog__form stack">
          <dl className="detail-list compact">
            <div>
              <dt>{t('admin.student360.financeWorkspace.billingAuthorityChange.currentAuthority')}</dt>
              <dd dir="auto">{currentName}</dd>
            </div>
          </dl>

          <label>
            <span>{t('admin.student360.financeWorkspace.billingAuthorityChange.newAuthority')}</span>
            <select
              className="input"
              value={targetKey}
              onChange={(e) => {
                setTargetKey(e.target.value);
                setSelfConfirmed(false);
                invalidatePreview();
              }}
              disabled={previewLoading || applyLoading || bootstrapLoading}
            >
              <option value="">
                {t('admin.student360.financeWorkspace.billingAuthorityChange.selectTarget')}
              </option>
              {guardianTargets.map((target) => {
                const selectionValue = encodeBillingAuthorityTargetKey({
                  kind: 'guardian',
                  guardianId: target.guardian_id ?? 0,
                  billingPartnerId: target.billing_partner_id,
                });
                return (
                  <option key={selectionValue} value={selectionValue} dir="auto">
                    {target.label}
                  </option>
                );
              })}
              <option value="student:self">
                {t('admin.student360.financeWorkspace.billingAuthorityChange.selfBillingOption', {
                  name: getStudentDisplayName(details.student),
                })}
              </option>
            </select>
          </label>

          {isSelfSelection ? (
            <div className="billing-authority-change-dialog__warning" role="alert">
              <p>{t('admin.student360.financeWorkspace.billingAuthorityChange.selfBillingWarning')}</p>
              <label className="billing-authority-change-dialog__confirm">
                <input
                  type="checkbox"
                  checked={selfConfirmed}
                  onChange={(e) => {
                    setSelfConfirmed(e.target.checked);
                    invalidatePreview();
                  }}
                  disabled={previewLoading || applyLoading}
                />
                <span>{t('admin.student360.financeWorkspace.billingAuthorityChange.selfBillingConfirm')}</span>
              </label>
            </div>
          ) : null}

          <label className="student-finance-agreement-context__reset-reason">
            <span>{t('admin.student360.financeWorkspace.billingAuthorityChange.reasonField')}</span>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                invalidatePreview();
              }}
              rows={3}
              required
              disabled={previewLoading || applyLoading}
            />
          </label>

          {formError ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="row billing-authority-change-dialog__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={previewLoading || applyLoading || !canSubmitBillingAuthorityPreview(selection)}
              onClick={() => void handlePreview()}
            >
              {previewLoading
                ? t('common.loading')
                : t('admin.student360.financeWorkspace.billingAuthorityChange.previewAction')}
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={!canApply || applyLoading}
              onClick={() => void handleApply()}
            >
              {applyLoading
                ? t('common.submitting')
                : t('admin.student360.financeWorkspace.billingAuthorityChange.applyAction')}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={previewLoading || applyLoading}
              onClick={handleClose}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>

        {preview ? (
          <section className="billing-authority-change-dialog__preview stack" aria-live="polite">
            <h4>{t('admin.student360.financeWorkspace.billingAuthorityChange.previewTitle')}</h4>
            <dl className="detail-list compact">
              <div>
                <dt>{t('admin.student360.financeWorkspace.billingAuthorityChange.currentAuthority')}</dt>
                <dd dir="auto">{authorityLabel(preview.currentAuthority, t)}</dd>
              </div>
              <div>
                <dt>{t('admin.student360.financeWorkspace.billingAuthorityChange.newAuthority')}</dt>
                <dd dir="auto">{authorityLabel(preview.newAuthority, t)}</dd>
              </div>
              <div>
                <dt>
                  {t('admin.student360.financeWorkspace.billingAuthorityChange.preview.preservedPaidAmount')}
                </dt>
                <dd>
                  <FinanceMoney
                    amount={preview.financialImpact.amount_preserved_paid}
                    currency={previewCurrency}
                  />
                </dd>
              </div>
              <div>
                <dt>
                  {t('admin.student360.financeWorkspace.billingAuthorityChange.preview.fullTransferAmount')}
                </dt>
                <dd>
                  <FinanceMoney
                    amount={preview.financialImpact.amount_transfer_full}
                    currency={previewCurrency}
                  />
                </dd>
              </div>
              <div>
                <dt>
                  {t('admin.student360.financeWorkspace.billingAuthorityChange.preview.splitSuccessorAmount')}
                </dt>
                <dd>
                  <FinanceMoney
                    amount={preview.financialImpact.amount_split_successor}
                    currency={previewCurrency}
                  />
                </dd>
              </div>
              <div>
                <dt>
                  {t('admin.student360.financeWorkspace.billingAuthorityChange.preview.affectedAgreements')}
                </dt>
                <dd>{preview.affectedAgreementsCount}</dd>
              </div>
            </dl>

            {preview.financialImpact.amount_transfer_full != null &&
            preview.financialImpact.amount_transfer_full > 0 ? (
              <p className="billing-authority-change-dialog__note" role="note">
                {t('admin.student360.financeWorkspace.billingAuthorityChange.preview.transferNotePrefix')}{' '}
                <FinanceMoney
                  amount={preview.financialImpact.amount_transfer_full}
                  currency={previewCurrency}
                />
                {t('admin.student360.financeWorkspace.billingAuthorityChange.preview.transferNoteSuffix')}
              </p>
            ) : null}

            <p className="billing-authority-change-dialog__note tiny muted" role="note">
              {t('admin.student360.financeWorkspace.billingAuthorityChange.preview.paidHistoryNote')}
            </p>
            <p className="billing-authority-change-dialog__note tiny muted" role="note">
              {t('admin.student360.financeWorkspace.billingAuthorityChange.preview.collectionsNote')}
            </p>

            {preview.financialImpact.has_split ? (
              <p className="billing-authority-change-dialog__note" role="note">
                {t('admin.student360.financeWorkspace.billingAuthorityChange.preview.splitNote')}
              </p>
            ) : null}

            {preview.narrativeLines.map((line) => (
              <p key={line} className="billing-authority-change-dialog__note tiny muted" role="note">
                {line}
              </p>
            ))}

            {preview.warnings.length ? (
              <>
                <h5>{t('admin.student360.financeWorkspace.billingAuthorityChange.preview.warnings')}</h5>
                <ul className="student-finance-change-plan-warnings">
                  {preview.warnings.map((item, index) => (
                    <li key={`${item.code ?? 'warning'}-${index}`}>{item.message}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {preview.blockers.length ? (
              <>
                <h5>{t('admin.student360.financeWorkspace.billingAuthorityChange.preview.blockers')}</h5>
                <ul className="student-finance-change-plan-blockers">
                  {preview.blockers.map((item, index) => (
                    <li key={`${item.code ?? 'blocker'}-${index}`}>{item.message}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {!preview.canApply ? (
              <p className="form-error" role="alert">
                {t('admin.student360.financeWorkspace.billingAuthorityChange.preview.applyDisabled')}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
