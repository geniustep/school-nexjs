'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { IconMoreHorizontal } from '@/components/icons/admin-icons';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { useStudentFinancialOverview } from '@/features/admin/student-finance/hooks/use-student-financial-overview';
import { resolveFinanceYearId } from '@/features/admin/student-finance/utils/resolve-finance-year-id';
import { resolveStudentFinanceOverviewMetrics } from '@/features/admin/student-finance/utils/resolve-student-finance-overview';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { isRelationshipActive } from '../utils/relationship-types';
import type { Student360TabId } from '../utils/student-360-tabs';
import {
  resolveOverviewArchiveAllowed,
  resolveOverviewEditAllowed,
  resolveOverviewManageGuardiansAllowed,
} from '../utils/resolve-overview-allowed-actions';
import { buildStudent360HeaderOverflowActions } from '../utils/build-student-360-header-shell';
import { resolveStudentHeaderFinancePaymentPresentation } from '../utils/resolve-student-header-finance-payment';
import type { StudentOverviewData } from '@/types/student-overview';
import type { StudentCapabilities, StudentDetailsData } from '@/types/student-360';
import { canCollectStudentPayments, canViewStudentFinance } from '../utils/resolve-capabilities';

export function Student360QuickActions({
  details,
  caps,
  overview,
  archived,
  editHref,
  onOpenTab,
  onArchiveSuccess,
  onEdit,
  onRecordPayment,
}: {
  details: StudentDetailsData;
  caps: StudentCapabilities;
  overview?: StudentOverviewData | null;
  archived: boolean;
  editHref: string;
  onOpenTab: (tab: Student360TabId) => void;
  onArchiveSuccess: () => void;
  /** Kept for callers that still pass an edit handler; edit uses editHref Link. */
  onEdit?: () => void;
  onRecordPayment?: () => void;
}) {
  const t = useT();
  const user = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const s = details.student;
  const canManage = resolveOverviewEditAllowed(overview, caps) && !archived;
  const canManageGuardians = resolveOverviewManageGuardiansAllowed(overview, caps);
  const canArchive = resolveOverviewArchiveAllowed(overview, caps, user) && !archived;
  const showFinance = canViewStudentFinance(caps);
  const canCollect = canCollectStudentPayments(caps);
  const financeRefState = useFinanceReferenceData();
  const financeYearId = useMemo(
    () => resolveFinanceYearId(details, financeRefState.academicYears, ''),
    [details, financeRefState.academicYears],
  );
  const financialOverviewState = useStudentFinancialOverview(
    s.id,
    financeYearId,
    showFinance && canCollect && !!financeYearId,
  );
  const financeMetrics = resolveStudentFinanceOverviewMetrics(financialOverviewState.data);
  const financePayment = resolveStudentHeaderFinancePaymentPresentation({
    showFinance,
    canCollect,
    overviewFinance: overview?.finance_summary,
    detailsFinance: details.finance_summary,
    metricsHint: financeMetrics
      ? {
          overdue: financeMetrics.overdue,
          outstanding: financeMetrics.remaining_actual ?? financeMetrics.remaining,
        }
      : null,
    metricsPending:
      showFinance &&
      canCollect &&
      !!financeYearId &&
      financialOverviewState.loading &&
      !financeMetrics,
  });

  const activeGuardians = details.guardian_relationships.filter((r) =>
    isRelationshipActive(r.state, r.active),
  );
  const hasEnrollment = !!details.current_enrollment;
  const missingDocs = details.document_summary?.missing_required ?? 0;
  const hasHealth = details.health_summary?.has_profile === true;

  const overflowActions = buildStudent360HeaderOverflowActions({
    canManage,
    canManageGuardians,
    hasActiveGuardian: activeGuardians.length > 0,
    hasEnrollment,
    canManageDocuments: caps.can_manage_documents === true,
    missingDocs,
    canManageHealth: caps.can_manage_health === true,
    hasHealth,
  });

  const overflowLabels: Record<(typeof overflowActions)[number]['key'], string> = {
    guardian: t('admin.student360.quickActions.addGuardian'),
    enrollment: t('admin.student360.quickActions.createEnrollment'),
    document: t('admin.student360.quickActions.addDocument'),
    health: t('admin.student360.quickActions.createHealth'),
  };

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (!canManage && !financePayment.visible) return null;

  const showOverflow = canManage && (overflowActions.length > 0 || canArchive);

  return (
    <div className="student-360-quick-actions" ref={rootRef}>
      {financePayment.visible ? (
        <button
          type="button"
          className={`btn btn--sm student-360-quick-actions__payment student-360-quick-actions__payment--${financePayment.tone}`}
          onClick={onRecordPayment}
          title={
            financePayment.tone === 'overdue'
              ? t('admin.student360.overview.badges.financeOverdue')
              : undefined
          }
        >
          <span className="student-360-quick-actions__payment-icon" aria-hidden="true">
            +
          </span>
          {t('admin.student360.financeWorkspace.actions.recordPayment')}
        </button>
      ) : null}

      {canManage ? (
        <Link href={editHref} className="btn btn--ghost btn--sm student-360-quick-actions__edit">
          {t('admin.student360.quickActions.editProfile')}
        </Link>
      ) : null}

      {showOverflow ? (
        <div className="student-360-quick-actions__more">
          <button
            type="button"
            className="btn btn--ghost btn--sm student-360-quick-actions__more-btn"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <IconMoreHorizontal aria-hidden="true" />
            <span className="visually-hidden">{t('admin.student360.quickActions.more')}</span>
          </button>
          {menuOpen ? (
            <div className="student-360-quick-actions__menu" role="menu">
              {overflowActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  role="menuitem"
                  className="student-360-quick-actions__menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    if (action.key === 'enrollment') {
                      onEdit?.();
                      return;
                    }
                    if (action.tab) onOpenTab(action.tab);
                  }}
                >
                  {overflowLabels[action.key]}
                </button>
              ))}
              {canArchive ? (
                <div className="student-360-quick-actions__menu-archive" role="none">
                  <ConfirmActionButton
                    label={t('admin.archive')}
                    confirmMessage={t('admin.confirmArchive')}
                    path={endpoints.admin.studentArchive(s.id)}
                    variant="danger"
                    onSuccess={() => {
                      setMenuOpen(false);
                      onArchiveSuccess();
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
