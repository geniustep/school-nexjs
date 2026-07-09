'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LoadingState } from '@/components/states/states';
import { Badge } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { fetchFamilyBatchDetail } from '../api/family-admissions-api';
import {
  trackFamilyPanelOpened,
  trackFamilySiblingLinkClicked,
} from '../utils/family-admissions-analytics';
import { familyBatchApplicationReference } from '../utils/family-admission-normalize';
import { admissionUiStageTone, resolveAdmissionUiStage } from '../utils/admission-ui-stage';
import type { FamilyBatchDetail } from '@/types/admission';

export function FamilyAdmissionFamilyPanel({
  batchId,
  currentAdmissionId,
  familyReference,
  familySize,
}: {
  batchId: number;
  currentAdmissionId: number;
  familyReference?: string | null;
  familySize?: number | null;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [detail, setDetail] = useState<FamilyBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const panelOpenedSent = useRef(false);

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
  }, [batchId, activeSchoolId]);

  const reference = detail?.family_reference ?? familyReference ?? '';
  const size = detail?.application_count ?? familySize ?? 0;

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
          <ul className="family-admission-detail-panel__list">
            {detail.applications.map((app) => {
              const isCurrent = app.id === currentAdmissionId;
              const appRef = familyBatchApplicationReference(app);
              const uiStage = resolveAdmissionUiStage(app);
              return (
                <li
                  key={app.id}
                  className={isCurrent ? 'family-admission-detail-panel__item--current' : undefined}
                >
                  <div className="family-admission-detail-panel__item-main">
                    <strong>{app.student_name}</strong>
                    <span className="mono">{appRef}</span>
                    <Badge tone={admissionUiStageTone(uiStage)}>
                      {t(`admin.admissions.uiStages.${uiStage}`)}
                    </Badge>
                    {isCurrent ? (
                      <Badge tone="blue">{t('admin.admissions.family.currentApplication')}</Badge>
                    ) : null}
                  </div>
                  {!isCurrent ? (
                    <Link
                      href={`/admin/admissions/${app.id}`}
                      className="btn btn--ghost btn--sm"
                      onClick={() => trackFamilySiblingLinkClicked()}
                    >
                      {t('admin.admissions.family.openApplication')}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </aside>
  );
}
