'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { LoadingState } from '@/components/states/states';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { fetchFamilyBatchDetail } from '../api/family-admissions-api';
import {
  trackFamilyPanelOpened,
  trackFamilySiblingLinkClicked,
} from '../utils/family-admissions-analytics';
import { AdmissionGuardiansDetails } from '@/features/admin/admissions/guardians';
import { familyBatchApplicationReference } from '../utils/family-admission-normalize';
import { orderFamilyBatchApplicationsForCurrentChild } from '../utils/family-batch-current-child';
import { canEditFamilyBatchGuardians } from '../utils/family-batch-guardians-edit';
import { resolveFamilyBatchMixedSummary } from '../utils/admission-status-display';
import { AdmissionStatusBadges } from './admission-status-badges';
import { FamilyBatchGuardiansEditDialog } from './family-batch-guardians-edit-dialog';
import { resolveAdmissionPrimaryAction } from '../utils/admission-primary-action';
import { refName } from '../utils/admission-labels';
import { buildAdmissionTabHref, type AdmissionTabId } from '../utils/admission-detail-tabs';
import type { FamilyBatchApplicationSummary, FamilyBatchDetail } from '@/types/admission';
import { cn } from '@/lib/utils/cn';

function childPrimaryHref(
  app: FamilyBatchApplicationSummary,
  primaryTarget: ReturnType<typeof resolveAdmissionPrimaryAction>['target'],
): string {
  if (primaryTarget.kind === 'href') return primaryTarget.href;
  if (primaryTarget.kind === 'tab') {
    return buildAdmissionTabHref(String(app.id), primaryTarget.tab as AdmissionTabId);
  }
  return `/admin/admissions/${app.id}`;
}

export function FamilyAdmissionFamilyPanel({
  batchId,
  currentAdmissionId,
  familyReference,
  familySize,
  onBatchUpdated,
}: {
  batchId: number;
  currentAdmissionId: number;
  familyReference?: string | null;
  familySize?: number | null;
  /** Called after guardians PATCH so the open application detail can refetch. */
  onBatchUpdated?: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [detail, setDetail] = useState<FamilyBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const panelOpenedSent = useRef(false);

  const reloadBatch = useCallback(() => {
    setReloadNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchFamilyBatchDetail(batchId, { active_school_id: activeSchoolId ?? undefined })
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setDetail(res.data);
          if (!panelOpenedSent.current) {
            panelOpenedSent.current = true;
            trackFamilyPanelOpened(
              res.data.application_count ?? familySize ?? res.data.applications.length,
            );
          }
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [batchId, activeSchoolId, familySize, reloadNonce]);

  const reference = detail?.family_reference ?? familyReference ?? '';
  const size = detail?.application_count ?? familySize ?? 0;

  const orderedApplications = useMemo(
    () =>
      detail
        ? orderFamilyBatchApplicationsForCurrentChild(detail.applications, currentAdmissionId)
        : [],
    [detail, currentAdmissionId],
  );

  const mixedSummary = useMemo(
    () => resolveFamilyBatchMixedSummary(orderedApplications),
    [orderedApplications],
  );

  const canEditGuardians = canEditFamilyBatchGuardians(detail?.allowed_actions);
  const editDeniedReasonRaw = detail?.allowed_actions?.edit_guardians_reason;
  const editDeniedReason =
    typeof editDeniedReasonRaw === 'string' && editDeniedReasonRaw.trim()
      ? editDeniedReasonRaw.trim()
      : null;

  function handleGuardiansSaved(next: FamilyBatchDetail) {
    setDetail(next);
    setEditOpen(false);
    onBatchUpdated?.();
    reloadBatch();
  }

  return (
    <aside className="family-admission-detail-panel" data-testid="family-admission-panel">
      <header className="family-admission-detail-panel__header">
        <h3>{t('admin.admissions.family.detailPanelTitle')}</h3>
        {reference ? <span className="mono">{reference}</span> : null}
      </header>

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : error ? (
        <p className="muted">{t('admin.admissions.family.detailPanelError')}</p>
      ) : detail ? (
        <>
          <p className="family-admission-detail-panel__size muted">
            {t('admin.admissions.family.detailPanelSize', { count: size })}
          </p>

          {mixedSummary === 'mixed' ? (
            <p
              className="tiny family-admission-detail-panel__mixed"
              data-testid="family-outcomes-mixed"
            >
              {t('admin.admissions.family.mixedOutcomes')}
            </p>
          ) : mixedSummary === 'uniform' && orderedApplications.length > 1 ? (
            <p
              className="tiny muted family-admission-detail-panel__mixed"
              data-testid="family-outcomes-unified"
            >
              {t('admin.admissions.family.uniformOutcomes')}
            </p>
          ) : null}

          <div className="family-admission-detail-panel__guardians-toolbar">
            {canEditGuardians ? (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setEditOpen(true)}
              >
                {t('admin.admissions.family.guardiansEdit.action')}
              </button>
            ) : editDeniedReason ? (
              <p className="muted tiny family-admission-detail-panel__edit-denied">
                {editDeniedReason}
              </p>
            ) : null}
          </div>

          <div className="family-admission-detail-panel__guardians">
            <AdmissionGuardiansDetails
              mode="family"
              guardians={detail.guardians}
              sharedContact={
                Array.isArray(detail.guardians) && detail.guardians.length > 0
                  ? null
                  : detail.shared_contact
              }
              childrenOptions={detail.applications.map((app) => ({
                id: app.id,
                name: app.student_name,
              }))}
              warnings={detail.warning_details ?? null}
            />
          </div>

          <div className="family-admission-detail-panel__siblings">
            <p className="family-admission-detail-panel__section-label">
              {t('admin.admissions.family.childrenInBatchSection')}
            </p>
            <ul className="family-admission-detail-panel__list">
              {orderedApplications.map((app) => {
                const appRef = familyBatchApplicationReference(app);
                const isCurrent = app.id === currentAdmissionId;
                const primary = resolveAdmissionPrimaryAction({
                  ...app,
                  id: app.id,
                });
                const href = childPrimaryHref(app, primary.target);
                const levelLabel = refName(app.requested_level);
                return (
                  <li
                    key={app.id}
                    className={cn(
                      'family-admission-detail-panel__child',
                      isCurrent && 'family-admission-detail-panel__child--current',
                    )}
                    data-testid={`family-child-row-${app.id}`}
                    data-current={isCurrent ? 'true' : undefined}
                  >
                    <div className="family-admission-detail-panel__item-main">
                      <div className="family-admission-detail-panel__child-title">
                        <strong>{app.student_name}</strong>
                        {isCurrent ? (
                          <span className="tiny family-admission-detail-panel__current-tag">
                            {t('admin.admissions.family.currentChild')}
                          </span>
                        ) : null}
                      </div>
                      <span className="mono">{appRef}</span>
                      {levelLabel ? (
                        <span className="tiny muted">{levelLabel}</span>
                      ) : null}
                      <AdmissionStatusBadges record={app} />
                      <p className="tiny muted family-admission-detail-panel__child-next">
                        {t(primary.descriptionKey)}
                      </p>
                    </div>
                    <div className="family-admission-detail-panel__child-actions">
                      {!primary.disabled ? (
                        <Link
                          href={href}
                          className="btn btn--primary btn--sm"
                          onClick={() => {
                            if (!isCurrent) trackFamilySiblingLinkClicked();
                          }}
                          data-testid={`family-child-primary-${app.id}`}
                        >
                          {t(primary.labelKey)}
                        </Link>
                      ) : null}
                      {!isCurrent ? (
                        <Link
                          href={`/admin/admissions/${app.id}`}
                          className="btn btn--ghost btn--sm"
                          onClick={() => trackFamilySiblingLinkClicked()}
                        >
                          {t('admin.admissions.family.openApplication')}
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <FamilyBatchGuardiansEditDialog
            open={editOpen}
            batch={detail}
            onClose={() => setEditOpen(false)}
            onSaved={handleGuardiansSaved}
          />
        </>
      ) : null}
    </aside>
  );
}
