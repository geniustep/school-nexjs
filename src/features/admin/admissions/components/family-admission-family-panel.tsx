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
import {
  familyBatchSiblingApplications,
  orderFamilyBatchApplicationsForCurrentChild,
} from '../utils/family-batch-current-child';
import { canEditFamilyBatchGuardians } from '../utils/family-batch-guardians-edit';
import { resolveFamilyBatchMixedSummary } from '../utils/admission-status-display';
import { AdmissionStatusBadges } from './admission-status-badges';
import { FamilyBatchGuardiansEditDialog } from './family-batch-guardians-edit-dialog';
import type { FamilyBatchDetail } from '@/types/admission';

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

  const siblingApplications = useMemo(
    () => familyBatchSiblingApplications(orderedApplications, currentAdmissionId),
    [orderedApplications, currentAdmissionId],
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
    <aside className="family-admission-detail-panel">
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
              {t('admin.admissions.family.siblingsInBatchSection')}
            </p>
            {mixedSummary === 'mixed' ? (
              <p className="tiny muted family-admission-detail-panel__mixed">
                {t('admin.admissions.family.mixedOutcomes')}
              </p>
            ) : mixedSummary === 'uniform' && orderedApplications.length > 1 ? (
              <p className="tiny muted family-admission-detail-panel__mixed">
                {t('admin.admissions.family.uniformOutcomes')}
              </p>
            ) : null}
            {siblingApplications.length === 0 ? (
              <p className="muted">{t('admin.admissions.family.noSiblingsInBatch')}</p>
            ) : (
              <ul className="family-admission-detail-panel__list">
                {siblingApplications.map((app) => {
                  const appRef = familyBatchApplicationReference(app);
                  return (
                    <li key={app.id}>
                      <div className="family-admission-detail-panel__item-main">
                        <strong>{app.student_name}</strong>
                        <span className="mono">{appRef}</span>
                        <AdmissionStatusBadges record={app} />
                      </div>
                      <Link
                        href={`/admin/admissions/${app.id}`}
                        className="btn btn--ghost btn--sm"
                        onClick={() => trackFamilySiblingLinkClicked()}
                      >
                        {t('admin.admissions.family.openApplication')}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
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
