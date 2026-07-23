'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useT } from '@/features/i18n/locale-context';
import { convertFamilyBatchApplicationsToStudents } from '../api/family-admissions-api';
import { familyBatchApplicationReference } from '../utils/family-admission-normalize';
import { buildOpenStudentHref } from '../utils/admission-registration';
import { applicationStatusLabelKey, resolveApplicationStatus } from '../utils/admission-modern-status';
import { refName } from '../utils/admission-labels';
import {
  canShowFamilyBatchSelectiveConversion,
  listEligibleFamilyBatchApplicationIds,
  resolveFamilyBatchConvertEligibility,
} from '../utils/family-batch-selective-conversion';
import {
  FamilyBatchConvertIdempotencySession,
  sortConvertApplicationIds,
} from '../utils/family-batch-selective-conversion-idempotency';
import {
  familyBatchConvertApiErrorMessage,
  familyBatchConvertAppStatusLabelKey,
  familyBatchConvertEligibilityLabelKey,
  familyBatchConvertSummaryKey,
  isFamilyBatchConvertIdempotencyConflict,
  isFamilyBatchConvertNetworkUncertainty,
  resolveFamilyBatchConvertUiOutcome,
  type FamilyBatchConvertUiOutcome,
} from '../utils/family-batch-selective-conversion-errors';
import type {
  FamilyBatchApplicationSummary,
  FamilyBatchConvertToStudentsResult,
} from '@/types/admission';
import { cn } from '@/lib/utils/cn';

type PendingAttempt = {
  applicationIds: number[];
  idempotencyKey: string;
};

export function FamilyBatchSelectiveConversionPanel({
  batchId,
  applications,
  busy: parentBusy = false,
  onConverted,
}: {
  batchId: number;
  applications: FamilyBatchApplicationSummary[];
  busy?: boolean;
  /** Refetch batch + parent detail after a terminal convert response. */
  onConverted: () => void;
}) {
  const t = useT();
  const idempotencyRef = useRef(new FamilyBatchConvertIdempotencySession());
  const submitGuardRef = useRef(false);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<FamilyBatchConvertUiOutcome | null>(null);
  const [result, setResult] = useState<FamilyBatchConvertToStudentsResult | null>(null);
  const [retryAttempt, setRetryAttempt] = useState<PendingAttempt | null>(null);

  const eligibleIds = useMemo(
    () => listEligibleFamilyBatchApplicationIds(applications),
    [applications],
  );
  const eligibleSet = useMemo(() => new Set(eligibleIds), [eligibleIds]);
  const nameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const app of applications) map.set(app.id, app.student_name);
    return map;
  }, [applications]);

  const hasEligible = canShowFamilyBatchSelectiveConversion(applications);
  const selectedSorted = useMemo(
    () => sortConvertApplicationIds(selectedIds.filter((id) => eligibleSet.has(id))),
    [selectedIds, eligibleSet],
  );
  const selectedCount = selectedSorted.length;
  const allEligibleSelected =
    eligibleIds.length > 0 && eligibleIds.every((id) => selectedSorted.includes(id));

  // Drop selections that are no longer eligible after refetch.
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => eligibleSet.has(id)));
  }, [eligibleSet]);

  const busy = pending || parentBusy;

  function toggleOne(id: number, checked: boolean) {
    if (busy || !eligibleSet.has(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return sortConvertApplicationIds(next);
    });
    // Changing selection after a finished attempt starts a new logical attempt.
    if (!pending && (result || outcome || retryAttempt)) {
      idempotencyRef.current.reset();
      setResult(null);
      setOutcome(null);
      setRetryAttempt(null);
      setErrorMessage(null);
    }
  }

  function selectAllEligible() {
    if (busy || eligibleIds.length === 0) return;
    setSelectedIds(eligibleIds);
    if (!pending && (result || outcome || retryAttempt)) {
      idempotencyRef.current.reset();
      setResult(null);
      setOutcome(null);
      setRetryAttempt(null);
      setErrorMessage(null);
    }
  }

  function clearSelection() {
    if (busy) return;
    setSelectedIds([]);
    if (!pending && (result || outcome || retryAttempt)) {
      idempotencyRef.current.reset();
      setResult(null);
      setOutcome(null);
      setRetryAttempt(null);
      setErrorMessage(null);
    }
  }

  function openConfirm() {
    if (busy || selectedCount === 0) return;
    setErrorMessage(null);
    setConfirmOpen(true);
  }

  async function runConversion(attempt: PendingAttempt) {
    if (submitGuardRef.current) return;
    submitGuardRef.current = true;
    setPending(true);
    setErrorMessage(null);

    const { response, httpStatus } = await convertFamilyBatchApplicationsToStudents(batchId, {
      idempotency_key: attempt.idempotencyKey,
      application_ids: attempt.applicationIds,
    });

    if (response.success && response.data) {
      const uiOutcome = resolveFamilyBatchConvertUiOutcome(response.data);
      setResult(response.data);
      setOutcome(uiOutcome);
      setRetryAttempt(null);
      setConfirmOpen(false);
      setSelectedIds([]);
      // Terminal success/partial/failed with envelope → new attempt needs a new key.
      idempotencyRef.current.reset();
      onConverted();
      setPending(false);
      submitGuardRef.current = false;
      return;
    }

    const err =
      !response.success && response.error
        ? response.error
        : {
            code: 'server_error',
            message: 'Request failed.',
            details: { status: httpStatus },
          };

    if (isFamilyBatchConvertIdempotencyConflict(err)) {
      setOutcome('idempotency_conflict');
      setErrorMessage(familyBatchConvertApiErrorMessage(err, t));
      setRetryAttempt(null);
      // Keep key — do not auto-rotate on conflict.
      setConfirmOpen(false);
      setPending(false);
      submitGuardRef.current = false;
      return;
    }

    if (isFamilyBatchConvertNetworkUncertainty(err, httpStatus)) {
      setOutcome('network_uncertainty');
      setErrorMessage(familyBatchConvertApiErrorMessage(err, t));
      setRetryAttempt(attempt);
      setConfirmOpen(false);
      setPending(false);
      submitGuardRef.current = false;
      return;
    }

    setOutcome('error');
    setErrorMessage(familyBatchConvertApiErrorMessage(err, t));
    setRetryAttempt(null);
    // Clear key only for definitive non-uncertain failures so a new confirm is a new attempt.
    if (httpStatus === 400 || httpStatus === 401 || httpStatus === 403 || httpStatus === 404) {
      idempotencyRef.current.reset();
    }
    setConfirmOpen(false);
    setPending(false);
    submitGuardRef.current = false;
  }

  async function confirmConversion() {
    if (busy || selectedCount === 0) return;
    const applicationIds = selectedSorted;
    const idempotencyKey = idempotencyRef.current.ensureKey(applicationIds);
    await runConversion({ applicationIds, idempotencyKey });
  }

  async function retryUncertain() {
    if (busy || !retryAttempt) return;
    // Same key + same payload.
    await runConversion(retryAttempt);
  }

  const selectedNames = selectedSorted
    .map((id) => nameById.get(id))
    .filter((name): name is string => Boolean(name && name.trim()));

  if (applications.length === 0) {
    return (
      <section
        className="family-batch-selective-conversion"
        data-testid="family-batch-selective-conversion"
      >
        <p className="muted tiny">{t('admin.admissions.family.selectiveConversion.empty')}</p>
      </section>
    );
  }

  return (
    <section
      className="family-batch-selective-conversion"
      data-testid="family-batch-selective-conversion"
      aria-busy={busy || undefined}
    >
      <header className="family-batch-selective-conversion__header">
        <h4 className="family-batch-selective-conversion__title">
          {t('admin.admissions.family.selectiveConversion.title')}
        </h4>
        <p className="muted tiny family-batch-selective-conversion__lead">
          {t('admin.admissions.family.selectiveConversion.lead')}
        </p>
      </header>

      {!hasEligible ? (
        <p
          className="muted tiny family-batch-selective-conversion__no-eligible"
          data-testid="family-batch-convert-no-eligible"
        >
          {t('admin.admissions.family.selectiveConversion.noEligible')}
        </p>
      ) : (
        <div className="family-batch-selective-conversion__toolbar" role="group">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={busy || allEligibleSelected}
            onClick={selectAllEligible}
            data-testid="family-batch-convert-select-all-eligible"
          >
            {t('admin.admissions.family.selectiveConversion.selectAllEligible')}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={busy || selectedCount === 0}
            onClick={clearSelection}
            data-testid="family-batch-convert-clear-selection"
          >
            {t('admin.admissions.family.selectiveConversion.clearSelection')}
          </button>
          <span
            className="tiny family-batch-selective-conversion__count"
            data-testid="family-batch-convert-selected-count"
          >
            {t('admin.admissions.family.selectiveConversion.selectedCount', {
              count: selectedCount,
            })}
          </span>
        </div>
      )}

      <ul className="family-batch-selective-conversion__list">
        {applications.map((app) => {
          const eligibility = resolveFamilyBatchConvertEligibility(app);
          const checkboxId = `family-batch-convert-${batchId}-${app.id}`;
          const checked = selectedSorted.includes(app.id);
          const status = resolveApplicationStatus(app);
          const levelLabel = refName(app.requested_level);
          const appRef = familyBatchApplicationReference(app);
          const studentId =
            typeof app.student_id === 'number' && app.student_id > 0 ? app.student_id : null;

          return (
            <li
              key={app.id}
              className={cn(
                'family-batch-selective-conversion__row',
                !eligibility.selectable && 'family-batch-selective-conversion__row--disabled',
                checked && 'family-batch-selective-conversion__row--selected',
              )}
              data-testid={`family-batch-convert-row-${app.id}`}
              data-eligible={eligibility.selectable ? 'true' : 'false'}
              data-eligibility={eligibility.reason}
            >
              <div className="family-batch-selective-conversion__row-main">
                {eligibility.selectable ? (
                  <label className="family-batch-selective-conversion__check" htmlFor={checkboxId}>
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={checked}
                      disabled={busy}
                      onChange={(e) => toggleOne(app.id, e.target.checked)}
                      data-testid={`family-batch-convert-check-${app.id}`}
                    />
                    <span className="family-batch-selective-conversion__check-label">
                      {app.student_name}
                    </span>
                  </label>
                ) : (
                  <p className="family-batch-selective-conversion__name">
                    <strong>{app.student_name}</strong>
                  </p>
                )}
                <div className="family-batch-selective-conversion__meta muted tiny">
                  <span className="mono">{appRef}</span>
                  {levelLabel ? <span>{levelLabel}</span> : null}
                  {status ? <span>{t(applicationStatusLabelKey(status))}</span> : null}
                </div>
                <p
                  className="tiny family-batch-selective-conversion__eligibility"
                  data-testid={`family-batch-convert-eligibility-${app.id}`}
                >
                  {t(familyBatchConvertEligibilityLabelKey(eligibility.reason))}
                  {eligibility.detailMessage ? ` — ${eligibility.detailMessage}` : null}
                </p>
                {studentId != null ? (
                  <Link
                    href={buildOpenStudentHref(studentId)}
                    className="btn btn--ghost btn--sm"
                    data-testid={`family-batch-convert-open-student-${app.id}`}
                  >
                    {t('admin.admissions.family.selectiveConversion.openStudent')}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="family-batch-selective-conversion__actions">
        {hasEligible ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={busy || selectedCount === 0}
            onClick={openConfirm}
            data-testid="family-batch-convert-submit"
            aria-disabled={busy || selectedCount === 0}
          >
            {pending
              ? t('admin.admissions.family.selectiveConversion.converting')
              : t('admin.admissions.family.selectiveConversion.convertSelected', {
                  count: selectedCount,
                })}
          </button>
        ) : null}
      </div>

      {outcome && result ? (
        <div
          className={cn(
            'family-batch-selective-conversion__result',
            outcome === 'partially_completed' &&
              'family-batch-selective-conversion__result--partial',
            outcome === 'failed' && 'family-batch-selective-conversion__result--failed',
            outcome === 'completed' && 'family-batch-selective-conversion__result--ok',
          )}
          data-testid="family-batch-convert-result"
          data-outcome={outcome}
          role="status"
        >
          <p className="family-batch-selective-conversion__result-summary">
            {t(familyBatchConvertSummaryKey(outcome), {
              succeeded: result.succeeded_count ?? 0,
              failed: result.failed_count ?? 0,
              requested: result.requested_count ?? result.applications.length,
              already: result.already_registered_count ?? 0,
            })}
          </p>
          <ul className="family-batch-selective-conversion__result-list">
            {result.applications.map((row) => {
              const name = nameById.get(row.application_id) ?? `#${row.application_id}`;
              const studentId =
                typeof row.student_id === 'number' && row.student_id > 0
                  ? row.student_id
                  : null;
              return (
                <li
                  key={row.application_id}
                  data-testid={`family-batch-convert-result-row-${row.application_id}`}
                  data-status={row.status}
                >
                  <strong>{name}</strong>
                  <span>{t(familyBatchConvertAppStatusLabelKey(String(row.status)))}</span>
                  {row.message ? <span className="muted tiny">{row.message}</span> : null}
                  {studentId != null ? (
                    <Link
                      href={buildOpenStudentHref(studentId)}
                      className="btn btn--ghost btn--sm"
                      data-testid={`family-batch-convert-result-student-${row.application_id}`}
                    >
                      {t('admin.admissions.family.selectiveConversion.openStudent')}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          className="family-batch-selective-conversion__error"
          data-testid="family-batch-convert-error"
          role="alert"
        >
          <p>{errorMessage}</p>
          {outcome === 'network_uncertainty' && retryAttempt ? (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={busy}
              onClick={() => void retryUncertain()}
              data-testid="family-batch-convert-retry"
            >
              {t('admin.admissions.family.selectiveConversion.retrySameAttempt')}
            </button>
          ) : null}
        </div>
      ) : null}

      <ConfirmationDialog
        open={confirmOpen}
        title={t('admin.admissions.family.selectiveConversion.confirmTitle')}
        confirmLabel={t('admin.admissions.family.selectiveConversion.confirmAction')}
        cancelLabel={t('common.cancel')}
        closeOnBackdrop={!pending}
        loading={pending}
        onClose={() => {
          if (!pending) setConfirmOpen(false);
        }}
        onConfirm={() => confirmConversion()}
        body={
          <div className="family-batch-selective-conversion__confirm-body">
            <p>
              {t('admin.admissions.family.selectiveConversion.confirmLead', {
                count: selectedCount,
              })}
            </p>
            <ul>
              {selectedNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
            <p className="muted tiny">
              {t('admin.admissions.family.selectiveConversion.confirmUnselected')}
            </p>
            <p className="muted tiny">
              {t('admin.admissions.family.selectiveConversion.confirmNoFinance')}
            </p>
            <p className="muted tiny">
              {t('admin.admissions.family.selectiveConversion.confirmPartialPossible')}
            </p>
          </div>
        }
      />
    </section>
  );
}
