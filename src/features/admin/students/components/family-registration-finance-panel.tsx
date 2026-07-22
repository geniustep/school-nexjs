'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LoadingState } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import {
  assignStudentFinancePlan,
  previewStudentFinancePlan,
} from '@/features/admin/student-finance/api/assign-plan-api';
import { classifyAssignPlanPreview } from '@/features/admin/student-finance/utils/normalize-assign-plan-preview';
import { resolveAssignErrorMessage } from '@/features/admin/finance/fee-plan-assign-errors';
import {
  StudentCreateFinanceCustomization,
  StudentCreateFinancePlanPicker,
} from '@/features/admin/students/components/student-create-finance-panels';
import { StudentFinanceMoney } from '@/features/admin/students/components/student-finance-money';
import { StudentCreateStyledSection } from '@/features/admin/students/components/student-create-section-header';
import type { StudentCreateFinanceFormState } from '@/types/student-enrollment-finance';
import {
  applyPreviewToFamilyFinanceDraft,
  applySharedFinanceSettings,
  familyFinanceOutcomeSummary,
  patchFamilyFinanceDraft,
  setFamilyFinanceDraftIncluded,
  shouldOfferFamilyFinanceFailedRetry,
  type FamilyChildFinanceDraft,
  type FamilyFinanceSubmitState,
} from '../utils/family-registration-finance-state';
import { runFamilyFinancePlansSubmit } from '../utils/family-registration-finance-submit';
import {
  describeSharedFinanceApplyFields,
  validateFamilyFinanceDrafts,
  type FamilyFinanceDraftFieldErrors,
} from '../utils/family-registration-finance-validate';

function tk(key: string): string {
  return `admin.student360.familyRegistration.finance.${key}`;
}

function FinanceChildSummaryCard({ draft }: { draft: FamilyChildFinanceDraft }) {
  const t = useT();
  const preview = draft.preview;
  const plan = preview?.kind === 'ready' ? preview.plan : null;
  const firstDue =
    plan?.suggestSnapshot?.suggested_periods?.find((p) => p.selected !== false)?.due_date ??
    plan?.suggestSnapshot?.suggested_periods?.[0]?.due_date ??
    null;
  const discountEnabled = draft.financeState?.planDiscount.enabled === true;

  return (
    <dl className="family-registration-finance__summary detail-list compact">
      <div>
        <dt>{t(tk('summary.billingResponsible'))}</dt>
        <dd dir="auto">{draft.billingResponsibleLabel || t(tk('summary.billingUnset'))}</dd>
      </div>
      {plan?.planName ? (
        <div>
          <dt>{t(tk('summary.feePlan'))}</dt>
          <dd dir="auto">{plan.planName}</dd>
        </div>
      ) : null}
      {plan?.academicYearName ? (
        <div>
          <dt>{t(tk('summary.academicYear'))}</dt>
          <dd dir="auto">{plan.academicYearName}</dd>
        </div>
      ) : null}
      {plan?.total != null ? (
        <div>
          <dt>{t(tk('summary.total'))}</dt>
          <dd>
            <StudentFinanceMoney amount={plan.total} currency={plan.currency} />
          </dd>
        </div>
      ) : null}
      <div>
        <dt>{t(tk('summary.discount'))}</dt>
        <dd>
          {discountEnabled
            ? `${draft.financeState?.planDiscount.type === 'percent' ? '%' : ''} ${draft.financeState?.planDiscount.value ?? ''}`.trim()
            : t(tk('summary.noDiscount'))}
        </dd>
      </div>
      {plan?.installmentCount != null ? (
        <div>
          <dt>{t(tk('summary.installments'))}</dt>
          <dd>{plan.installmentCount}</dd>
        </div>
      ) : null}
      {firstDue ? (
        <div>
          <dt>{t(tk('summary.firstDue'))}</dt>
          <dd>{firstDue}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function FamilyRegistrationFinancePanel({
  mode,
  drafts,
  submitState,
  onDraftsChange,
  onSubmitStateChange,
  onBackToRegistrationResult,
  onBackToSetup,
  onCompleted,
}: {
  mode: 'finance' | 'finance_result';
  drafts: FamilyChildFinanceDraft[];
  submitState: FamilyFinanceSubmitState;
  onDraftsChange: (
    next:
      | FamilyChildFinanceDraft[]
      | ((prev: FamilyChildFinanceDraft[]) => FamilyChildFinanceDraft[]),
  ) => void;
  onSubmitStateChange: (next: FamilyFinanceSubmitState) => void;
  onBackToRegistrationResult: () => void;
  onBackToSetup: () => void;
  onCompleted: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const submittingRef = useRef(false);
  const [activeLocalId, setActiveLocalId] = useState<string | null>(
    drafts[0]?.localId ?? null,
  );
  const [fieldErrors, setFieldErrors] = useState<FamilyFinanceDraftFieldErrors | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sharedConfirmOpen, setSharedConfirmOpen] = useState(false);
  const [sharedSourceLocalId, setSharedSourceLocalId] = useState<string | null>(null);
  const previewsStartedRef = useRef(false);

  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const previewRequestIdRef = useRef(0);

  const submitting = submitState.phase === 'submitting' || submittingRef.current;
  const outcome = familyFinanceOutcomeSummary(submitState.results);
  const activeDraft =
    drafts.find((d) => d.localId === activeLocalId) ?? drafts[0] ?? null;
  const canCreateRemaining = drafts.some((draft) => {
    if (!draft.included) return false;
    const prior = submitState.results.find((r) => r.localId === draft.localId);
    if (!prior) return true;
    return (
      prior.status !== 'succeeded' &&
      prior.status !== 'already_active' &&
      prior.status !== 'ambiguous'
    );
  });
  const createDisabled =
    submitting || (submitState.lockedAgainstFullResubmit && !canCreateRemaining);

  useEffect(() => {
    if (mode !== 'finance') return;
    const needsPreview = draftsRef.current.some(
      (d) => d.preview == null && !d.previewLoading && !d.previewErrorMessage,
    );
    if (!needsPreview && previewsStartedRef.current) return;
    if (draftsRef.current.length === 0) return;
    previewsStartedRef.current = true;

    let cancelled = false;
    const requestId = ++previewRequestIdRef.current;
    const initialDrafts = draftsRef.current;

    async function loadPreviews() {
      onDraftsChange((prev) =>
        prev.map((d) =>
          d.preview == null
            ? { ...d, previewLoading: true, preview: null }
            : d,
        ),
      );

      const nextByLocalId = new Map<string, FamilyChildFinanceDraft>();
      for (const draft of initialDrafts) {
        if (cancelled || requestId !== previewRequestIdRef.current) return;
        if (draft.preview != null) {
          nextByLocalId.set(draft.localId, draft);
          continue;
        }
        try {
          const res = await previewStudentFinancePlan(draft.studentId, {
            ...(draft.academicYearId != null
              ? { academic_year_id: draft.academicYearId }
              : {}),
          });
          const classified = classifyAssignPlanPreview(res);
          nextByLocalId.set(
            draft.localId,
            applyPreviewToFamilyFinanceDraft(draft, classified),
          );
        } catch {
          nextByLocalId.set(draft.localId, {
            ...draft,
            previewLoading: false,
            preview: { kind: 'error', message: t(tk('errors.previewNetwork')) },
            previewErrorMessage: t(tk('errors.previewNetwork')),
          });
        }
        if (!cancelled && requestId === previewRequestIdRef.current) {
          onDraftsChange((prev) =>
            prev.map((d) => {
              const loaded = nextByLocalId.get(d.localId);
              if (loaded) return loaded;
              if (d.preview == null) return { ...d, previewLoading: true };
              return d;
            }),
          );
        }
      }
    }

    void loadPreviews();
    return () => {
      cancelled = true;
    };
    // Load missing previews when entering finance setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function patchActiveFinance(patch: Partial<StudentCreateFinanceFormState>) {
    if (!activeDraft) return;
    onDraftsChange((prev) =>
      patchFamilyFinanceDraft(prev, activeDraft.localId, {
        hasLocalCustomization: true,
        financeState: (() => {
          const current = prev.find((d) => d.localId === activeDraft.localId);
          return current?.financeState
            ? { ...current.financeState, ...patch }
            : null;
        })(),
      }),
    );
    setFieldErrors(null);
  }

  async function reloadPreview(localId: string, feePlanId?: number) {
    const draft = draftsRef.current.find((d) => d.localId === localId);
    if (!draft) return;
    const requestId = ++previewRequestIdRef.current;
    onDraftsChange((prev) =>
      patchFamilyFinanceDraft(prev, localId, { previewLoading: true }),
    );
    try {
      const res = await previewStudentFinancePlan(draft.studentId, {
        ...(draft.academicYearId != null
          ? { academic_year_id: draft.academicYearId }
          : {}),
        ...(feePlanId != null ? { fee_plan_id: feePlanId } : {}),
      });
      if (requestId !== previewRequestIdRef.current) return;
      const classified = classifyAssignPlanPreview(res);
      onDraftsChange((prev) =>
        prev.map((d) =>
          d.localId === localId ? applyPreviewToFamilyFinanceDraft(d, classified) : d,
        ),
      );
    } catch {
      if (requestId !== previewRequestIdRef.current) return;
      onDraftsChange((prev) =>
        prev.map((d) =>
          d.localId === localId
            ? {
                ...d,
                previewLoading: false,
                preview: { kind: 'error', message: t(tk('errors.previewNetwork')) },
                previewErrorMessage: t(tk('errors.previewNetwork')),
              }
            : d,
        ),
      );
    }
  }

  function requestApplyShared() {
    if (!activeDraft) return;
    setSharedSourceLocalId(activeDraft.localId);
    const hasCustomizedTargets = drafts.some(
      (d) =>
        d.localId !== activeDraft.localId &&
        d.included &&
        d.hasLocalCustomization,
    );
    if (hasCustomizedTargets) {
      setSharedConfirmOpen(true);
      return;
    }
    applyShared(false);
  }

  function applyShared(overwriteCustomized: boolean) {
    const sourceLocalId = sharedSourceLocalId ?? activeDraft?.localId;
    if (!sourceLocalId) return;
    onDraftsChange((prev) => {
      const outcomeApply = applySharedFinanceSettings({
        drafts: prev,
        sourceLocalId,
        targetLocalIds: prev.map((d) => d.localId),
        overwriteCustomized,
      });
      if (outcomeApply.appliedLocalIds.length > 0) {
        queueMicrotask(() =>
          toast.success(
            t(tk('toast.sharedApplied'), { count: outcomeApply.appliedLocalIds.length }),
          ),
        );
      }
      if (outcomeApply.skipped.length > 0) {
        queueMicrotask(() =>
          toast.error(t(tk('toast.sharedSkipped'), { count: outcomeApply.skipped.length })),
        );
      }
      return outcomeApply.drafts;
    });
    setSharedConfirmOpen(false);
  }

  async function handleConfirmCreate(options?: { retryFailedOnly?: boolean }) {
    if (submittingRef.current) return;
    if (!options?.retryFailedOnly) {
      const validation = validateFamilyFinanceDrafts(drafts, t);
      if (!validation.ok) {
        setFieldErrors(validation.errors);
        const firstId = Object.keys(validation.errors.byLocalId)[0];
        if (firstId) setActiveLocalId(firstId);
        toast.error(validation.errors.message ?? t(tk('errors.generic')));
        setConfirmOpen(false);
        return;
      }
    }

    submittingRef.current = true;
    setConfirmOpen(false);
    setFieldErrors(null);

    const retryIds = options?.retryFailedOnly
      ? submitState.results
          .filter((r) => r.status === 'failed' && r.canRetrySafely)
          .map((r) => r.localId)
      : submitState.lockedAgainstFullResubmit
        ? drafts
            .filter((draft) => {
              if (!draft.included) return false;
              const prior = submitState.results.find((r) => r.localId === draft.localId);
              return (
                !prior ||
                (prior.status !== 'succeeded' &&
                  prior.status !== 'already_active' &&
                  prior.status !== 'ambiguous')
              );
            })
            .map((d) => d.localId)
        : undefined;

    const finalState = await runFamilyFinancePlansSubmit({
      drafts,
      onlyLocalIds: retryIds,
      priorResults:
        options?.retryFailedOnly || submitState.lockedAgainstFullResubmit
          ? submitState.results
          : undefined,
      previewPlan: (studentId, body) => previewStudentFinancePlan(studentId, body),
      assignPlan: (studentId, body) => assignStudentFinancePlan(studentId, body),
      mapErrorMessage: (error) =>
        resolveAssignErrorMessage(error?.code, error?.message, t),
      onProgress: (state) => onSubmitStateChange(state),
    });

    submittingRef.current = false;
    onSubmitStateChange(finalState);
    onCompleted();

    const summary = familyFinanceOutcomeSummary(finalState.results);
    if (summary.kind === 'full_success') {
      toast.success(t(tk('toast.fullSuccess')));
    } else if (summary.kind === 'partial_success') {
      toast.error(t(tk('toast.partialSuccess')));
    } else if (summary.kind === 'full_failure') {
      toast.error(t(tk('toast.failure')));
    }
  }

  if (mode === 'finance_result') {
    return (
      <StudentCreateStyledSection
        icon="review"
        title={t(tk('resultTitle'))}
        lead={t(tk(`resultLead.${outcome.kind}`))}
      >
        <p className="family-registration__mode-note" role="note">
          {t(tk('planNotPaymentNote'))}
        </p>
        <ul className="family-registration__results" data-testid="family-finance-results">
          {submitState.results.map((result) => (
            <li
              key={result.localId}
              data-status={result.status}
              className="family-registration__result-item"
            >
              <div>
                <strong>{result.displayName}</strong>
                <span>{t(tk(`status.${result.status}`))}</span>
              </div>
              {result.errorMessage &&
              result.errorMessage !== 'network_error' &&
              result.errorMessage !== 'stopped_after_ambiguous' &&
              result.errorMessage !== 'invalid_plan_draft' ? (
                <p role="status">{result.errorMessage}</p>
              ) : null}
              {result.status === 'ambiguous' ? (
                <p role="status">{t(tk('errors.ambiguousFailure'))}</p>
              ) : null}
              <div className="family-registration-finance__result-links">
                <Link
                  href={`/admin/students/${result.studentId}?tab=finance`}
                  className="btn btn--ghost btn--sm"
                >
                  {t(tk('openFinance'))}
                </Link>
                <Link
                  href={`/admin/students/${result.studentId}`}
                  className="btn btn--ghost btn--sm"
                >
                  {t('admin.student360.familyRegistration.openStudent')}
                </Link>
              </div>
            </li>
          ))}
        </ul>

        <div className="family-registration__result-actions">
          {shouldOfferFamilyFinanceFailedRetry(submitState.results) ? (
            <button
              type="button"
              className="btn btn--primary"
              disabled={submitting}
              onClick={() => void handleConfirmCreate({ retryFailedOnly: true })}
            >
              {t(tk('retryFailed'))}
            </button>
          ) : null}
                      {drafts.some((d) => {
            const result = submitState.results.find((r) => r.localId === d.localId);
            return (
              d.included &&
              result &&
              result.status !== 'succeeded' &&
              result.status !== 'already_active' &&
              result.status !== 'skipped' &&
              result.status !== 'ambiguous'
            );
          }) ? (
            <button
              type="button"
              className="btn btn--secondary"
              disabled={submitting}
              onClick={onBackToSetup}
            >
              {t(tk('backToSetup'))}
            </button>
          ) : null}
          <Link href="/admin/students" className="btn btn--secondary">
            {t('admin.student360.familyRegistration.backToList')}
          </Link>
        </div>
      </StudentCreateStyledSection>
    );
  }

  return (
    <StudentCreateStyledSection
      icon="review"
      title={t(tk('setupTitle'))}
      lead={t(tk('setupLead'))}
    >
      <p className="family-registration__mode-note" role="note">
        {t(tk('sequentialNote'))}
      </p>
      <p className="family-registration__mode-note" role="note">
        {t(tk('planNotPaymentNote'))}
      </p>

      {fieldErrors?.message ? (
        <p className="family-registration__alert" role="alert">
          {fieldErrors.message}
        </p>
      ) : null}

      <div className="family-registration-finance__layout">
        <ul className="family-registration-finance__tabs" role="tablist">
          {drafts.map((draft) => (
            <li key={draft.localId}>
              <button
                type="button"
                role="tab"
                aria-selected={activeDraft?.localId === draft.localId}
                className={`family-registration-finance__tab${
                  activeDraft?.localId === draft.localId
                    ? ' family-registration-finance__tab--active'
                    : ''
                }`}
                onClick={() => setActiveLocalId(draft.localId)}
              >
                <span dir="auto">{draft.displayName}</span>
                {!draft.included ? (
                  <span className="tiny muted">{t(tk('excludedBadge'))}</span>
                ) : null}
                {draft.preview?.kind === 'active_agreement_exists' ? (
                  <span className="tiny muted">{t(tk('alreadyActiveBadge'))}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>

        {activeDraft ? (
          <div
            className="family-registration-finance__panel"
            role="tabpanel"
            data-testid={`family-finance-child-${activeDraft.localId}`}
          >
            <div className="family-registration-finance__panel-head">
              <h3 dir="auto">{activeDraft.displayName}</h3>
              <label className="student-create-form__checkbox">
                <input
                  type="checkbox"
                  checked={activeDraft.included}
                  disabled={submitting}
                  onChange={(e) =>
                    onDraftsChange((prev) =>
                      setFamilyFinanceDraftIncluded(
                        prev,
                        activeDraft.localId,
                        e.target.checked,
                      ),
                    )
                  }
                />
                <span>{t(tk('includeChild'))}</span>
              </label>
            </div>

            {fieldErrors?.byLocalId[activeDraft.localId]?.message ? (
              <p className="family-registration__alert" role="alert">
                {fieldErrors.byLocalId[activeDraft.localId].message}
              </p>
            ) : null}
            {fieldErrors?.byLocalId[activeDraft.localId]?.feePlan ? (
              <p className="family-registration__alert" role="alert">
                {fieldErrors.byLocalId[activeDraft.localId].feePlan}
              </p>
            ) : null}
            {fieldErrors?.byLocalId[activeDraft.localId]?.discount ? (
              <p className="family-registration__alert" role="alert">
                {fieldErrors.byLocalId[activeDraft.localId].discount}
              </p>
            ) : null}
            {fieldErrors?.byLocalId[activeDraft.localId]?.reason ? (
              <p className="family-registration__alert" role="alert">
                {fieldErrors.byLocalId[activeDraft.localId].reason}
              </p>
            ) : null}

            {activeDraft.previewLoading ? (
              <LoadingState label={t(tk('loadingPreview'))} />
            ) : null}

            {!activeDraft.previewLoading &&
            activeDraft.preview?.kind === 'active_agreement_exists' ? (
              <div className="family-registration-finance__notice" role="status">
                <p>{t(tk('alreadyActiveNotice'))}</p>
                <Link
                  href={`/admin/students/${activeDraft.studentId}?tab=finance`}
                  className="btn btn--ghost btn--sm"
                >
                  {t(tk('openFinance'))}
                </Link>
              </div>
            ) : null}

            {!activeDraft.previewLoading &&
            activeDraft.preview?.kind === 'no_eligible_plan' ? (
              <p className="family-registration-finance__notice" role="status">
                {t(tk('errors.noEligiblePlan'))}
              </p>
            ) : null}

            {!activeDraft.previewLoading &&
            activeDraft.preview?.kind === 'missing_academic_enrollment' ? (
              <p className="family-registration-finance__notice" role="status">
                {t(tk('errors.missingEnrollment'))}
              </p>
            ) : null}

            {!activeDraft.previewLoading &&
            activeDraft.preview?.kind === 'candidate_selection' ? (
              <div className="family-registration-finance__notice">
                <p>{t(tk('errors.planSelectionRequired'))}</p>
                <ul className="family-registration-finance__candidates">
                  {activeDraft.preview.candidates.map((candidate) => (
                    <li key={candidate.id}>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        disabled={submitting}
                        onClick={() => void reloadPreview(activeDraft.localId, candidate.id)}
                      >
                        {candidate.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!activeDraft.previewLoading &&
            activeDraft.preview?.kind === 'error' ? (
              <div className="family-registration-finance__notice" role="alert">
                <p>
                  {activeDraft.previewErrorMessage ||
                    (activeDraft.preview.message &&
                    activeDraft.preview.message !== 'network_error'
                      ? activeDraft.preview.message
                      : t(tk('errors.previewNetwork')))}
                </p>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => void reloadPreview(activeDraft.localId)}
                >
                  {t(tk('retryPreview'))}
                </button>
              </div>
            ) : null}

            {!activeDraft.previewLoading &&
            activeDraft.preview?.kind === 'ready' &&
            activeDraft.financeState &&
            activeDraft.preview.plan.suggestSnapshot ? (
              <>
                <FinanceChildSummaryCard draft={activeDraft} />
                <StudentCreateFinancePlanPicker
                  suggest={activeDraft.preview.plan.suggestSnapshot}
                  financeState={activeDraft.financeState}
                  onSelectPlan={(planId) => void reloadPreview(activeDraft.localId, planId)}
                />
                <label className="student-create-form__checkbox">
                  <input
                    type="checkbox"
                    checked={activeDraft.financeState.customizePlan}
                    disabled={submitting || !activeDraft.included}
                    onChange={(e) =>
                      patchActiveFinance({ customizePlan: e.target.checked })
                    }
                  />
                  <span>{t(tk('customizePlan'))}</span>
                </label>
                {activeDraft.financeState.customizePlan ? (
                  <StudentCreateFinanceCustomization
                    suggest={activeDraft.preview.plan.suggestSnapshot}
                    financeState={activeDraft.financeState}
                    previewError={null}
                    onFinanceChange={patchActiveFinance}
                  />
                ) : (
                  <div className="family-registration-finance__simple-discount">
                    <label className="student-create-form__checkbox">
                      <input
                        type="checkbox"
                        checked={activeDraft.financeState.planDiscount.enabled}
                        disabled={submitting || !activeDraft.included}
                        onChange={(e) =>
                          patchActiveFinance({
                            planDiscount: {
                              ...activeDraft.financeState!.planDiscount,
                              enabled: e.target.checked,
                            },
                            customizePlan: e.target.checked
                              ? true
                              : activeDraft.financeState!.customizePlan,
                          })
                        }
                      />
                      <span>{t(tk('enableDiscount'))}</span>
                    </label>
                  </div>
                )}
                <div className="family-registration-finance__shared-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={submitting || !activeDraft.included}
                    onClick={requestApplyShared}
                  >
                    {t(tk('applyShared'))}
                  </button>
                  <p className="tiny muted">{t(tk('applySharedHint'))}</p>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="family-registration-finance__compact-summaries">
        <h4>{t(tk('compactSummariesTitle'))}</h4>
        <ul>
          {drafts.map((draft) => (
            <li key={draft.localId}>
              <button
                type="button"
                className="family-registration-finance__compact-item"
                onClick={() => setActiveLocalId(draft.localId)}
              >
                <strong dir="auto">{draft.displayName}</strong>
                {!draft.included ? (
                  <span>{t(tk('excludedBadge'))}</span>
                ) : draft.preview?.kind === 'ready' && draft.preview.plan.total != null ? (
                  <StudentFinanceMoney
                    amount={draft.preview.plan.total}
                    currency={draft.preview.plan.currency}
                  />
                ) : (
                  <span className="tiny muted">{t(tk(`previewKind.${draft.preview?.kind ?? 'loading'}`))}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {confirmOpen ? (
        <div className="family-registration-finance__confirm" role="dialog" aria-modal="true">
          <h3>{t(tk('confirmTitle'))}</h3>
          <p>{t(tk('confirmLead'))}</p>
          <ul>
            {drafts
              .filter((d) => d.included && d.preview?.kind !== 'active_agreement_exists')
              .map((d) => (
                <li key={d.localId} dir="auto">
                  {d.displayName}
                  {d.preview?.kind === 'ready' && d.preview.plan.planName
                    ? ` — ${d.preview.plan.planName}`
                    : ''}
                </li>
              ))}
          </ul>
          <div className="row">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setConfirmOpen(false)}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={submitting}
              onClick={() => void handleConfirmCreate()}
            >
              {submitting ? t(tk('submitting')) : t(tk('confirmCreate'))}
            </button>
          </div>
        </div>
      ) : null}

      {sharedConfirmOpen ? (
        <div className="family-registration-finance__confirm" role="dialog" aria-modal="true">
          <h3>{t(tk('sharedConfirmTitle'))}</h3>
          <p>{t(tk('sharedConfirmLead'))}</p>
          <ul>
            {describeSharedFinanceApplyFields(t).map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          <div className="row">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setSharedConfirmOpen(false)}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => applyShared(true)}
            >
              {t(tk('sharedConfirmApply'))}
            </button>
          </div>
        </div>
      ) : null}

      <div className="family-registration__result-actions">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={submitting}
          onClick={onBackToRegistrationResult}
        >
          {t('common.back')}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          disabled={createDisabled}
          onClick={() => setConfirmOpen(true)}
        >
          {submitting ? t(tk('submitting')) : t(tk('createPlans'))}
        </button>
      </div>
    </StudentCreateStyledSection>
  );
}
