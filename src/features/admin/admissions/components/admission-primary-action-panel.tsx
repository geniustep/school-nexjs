'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils/cn';
import { executeAdmissionAction } from '../api/admissions-api';
import { mapAdmissionActionError } from '../utils/admission-action-errors';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import { buildAdmissionTabHref, type AdmissionTabId } from '../utils/admission-detail-tabs';
import {
  filterDailyModernActions,
  hasModernContract,
  resolveDetailPrimaryActionCode,
  resolveStudentNavigation,
  shouldShowConvertToStudentAction,
} from '../utils/admission-modern-actions';
import { resolveApplicationStatus } from '../utils/admission-modern-status';
import { buildContinueRegistrationHref } from '../utils/admission-registration';
import type { AdmissionDetail } from '@/types/admission';
import { AdmissionQuickFollowUpDialog } from './admission-quick-follow-up-dialog';
import { AdmissionModernDecisionDialog } from './admission-modern-decision-dialogs';
import { AdmissionReopenDialog } from './admission-reopen-dialog';

type DecisionAction =
  | 'accept'
  | 'reject'
  | 'record_family_approval'
  | 'accept_and_record_family_approval';

function actionLabelKey(code: string): string {
  switch (code) {
    case 'log_contact':
      return 'admin.admissions.actions.logContact';
    case 'accept':
      return 'admin.admissions.actions.accept';
    case 'reject':
      return 'admin.admissions.actions.reject';
    case 'record_family_approval':
      return 'admin.admissions.actions.recordFamilyApproval';
    case 'accept_and_record_family_approval':
      return 'admin.admissions.actions.acceptAndRecordFamilyApproval';
    case 'convert_to_student':
      return 'admin.admissions.actions.convertToStudent';
    case 'reopen':
      return 'admin.admissions.actions.reopen';
    case 'close':
      return 'admin.admissions.actions.close';
    case 'waitlist':
      return 'admin.admissions.actions.waitlist';
    default:
      return `admin.admissions.actions.${code}`;
  }
}

export function AdmissionPrimaryActionPanel({
  detail,
  admissionId,
  onUpdated,
  onRequestEdit,
  className,
}: {
  detail: AdmissionDetail;
  admissionId: string | number;
  onUpdated: (next?: AdmissionDetail) => void;
  onRequestEdit?: () => void;
  className?: string;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { activeSchoolId } = useAdminSession();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [decisionAction, setDecisionAction] = useState<DecisionAction | null>(null);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const modern = hasModernContract(detail);
  const status = resolveApplicationStatus(detail);
  const registered = status === 'registered';
  const primaryCode = resolveDetailPrimaryActionCode(detail);
  const daily = filterDailyModernActions(detail.modern_allowed_actions);
  const studentNav = resolveStudentNavigation(detail.navigation, detail.student_id);
  const convertAllowed = shouldShowConvertToStudentAction(detail);
  const secondary = daily.filter(
    (action) =>
      action.code !== primaryCode &&
      action.code !== 'link_existing_student' &&
      action.code !== 'start_registration' &&
      // Dedicated convert CTA already rendered — do not bury a duplicate in overflow.
      !(convertAllowed && action.code === 'convert_to_student') &&
      !(primaryCode === 'convert_to_student' && action.code === 'convert_to_student'),
  );

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const goTab = useCallback(
    (tab: string) => {
      router.push(buildAdmissionTabHref(String(admissionId), tab as AdmissionTabId), {
        scroll: false,
      });
    },
    [admissionId, router],
  );

  function showError(error: unknown) {
    const mapped = mapAdmissionActionError(error);
    toast.error(mapped.startsWith('admin.') ? t(mapped) : mapped || admissionApiErrorMessage(error as never, t));
  }

  async function runAction(action: string) {
    if (activeSchoolId == null || busy) return;
    setBusy(true);
    const res = await executeAdmissionAction(
      Number(admissionId),
      { action },
      { active_school_id: activeSchoolId },
    );
    setBusy(false);
    if (!res.success) {
      showError(res.error);
      return;
    }
    toast.success(t('common.saved'));
    onUpdated(res.data);
    if (action === 'convert_to_student') {
      router.push(buildContinueRegistrationHref(admissionId));
    }
  }

  function openPrimary() {
    if (!primaryCode || registered || busy) return;
    if (primaryCode === 'log_contact') {
      setFollowUpOpen(true);
      return;
    }
    if (
      primaryCode === 'accept' ||
      primaryCode === 'reject' ||
      primaryCode === 'record_family_approval' ||
      primaryCode === 'accept_and_record_family_approval'
    ) {
      setDecisionAction(primaryCode);
      return;
    }
    if (primaryCode === 'reopen') {
      setReopenOpen(true);
      return;
    }
    if (primaryCode === 'convert_to_student') {
      void runAction('convert_to_student');
      return;
    }
    if (primaryCode === 'add_note' || primaryCode === 'record_assessment' || primaryCode === 'complete_assessment') {
      goTab(primaryCode.includes('assessment') ? 'assessments_appointments' : 'history');
      return;
    }
    void runAction(primaryCode);
  }

  if (!modern) {
    return (
      <div className={cn('admission-primary-action-panel muted', className)} data-testid="admission-primary-action-panel">
        <p>{t('admin.admissions.primaryAction.noActionDesc')}</p>
        {onRequestEdit ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRequestEdit}>
            {t('admin.admissions.editRequest')}
          </button>
        ) : null}
      </div>
    );
  }

  if (registered) {
    return (
      <div className={cn('admission-primary-action-panel', className)} data-testid="admission-primary-action-panel">
        <p className="muted">{t('admin.admissions.applicationStatus.registered')}</p>
        {studentNav?.href ? (
          <Link href={studentNav.href} className="btn btn--primary btn--sm" data-testid="admission-open-student-nav">
            {t('admin.admissions.registration.openStudentProfile')}
          </Link>
        ) : null}
      </div>
    );
  }

  const primaryAllowed = primaryCode != null;
  const showConvertFallback =
    convertAllowed && primaryCode !== 'convert_to_student';

  return (
    <div
      ref={rootRef}
      className={cn('admission-primary-action-panel', className)}
      data-testid="admission-primary-action-panel"
    >
      {primaryCode && primaryAllowed ? (
        <div className="admission-primary-action-panel__main">
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy}
            data-testid={
              primaryCode === 'convert_to_student'
                ? 'admission-convert-to-student-primary'
                : 'admission-primary-action-button'
            }
            onClick={openPrimary}
          >
            {t(actionLabelKey(primaryCode))}
          </button>
          <p className="muted tiny">{t('admin.admissions.nextAction')}</p>
        </div>
      ) : (
        <p className="muted" data-testid="admission-primary-action-empty">
          {t('admin.admissions.primaryAction.noActionDesc')}
        </p>
      )}

      {showConvertFallback ? (
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={busy}
          data-testid="admission-convert-to-student-secondary"
          onClick={() => void runAction('convert_to_student')}
        >
          {t(actionLabelKey('convert_to_student'))}
        </button>
      ) : null}

      {secondary.length > 0 ? (
        <div className="admission-primary-action-panel__more">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {t('admin.admissions.table.actions')}
          </button>
          {menuOpen ? (
            <div id={menuId} role="menu" className="admissions-row-actions__menu">
              {secondary.map((action) => (
                <button
                  key={action.code}
                  type="button"
                  role="menuitem"
                  className="admissions-row-actions__item"
                  disabled={busy}
                  onClick={() => {
                    setMenuOpen(false);
                    if (action.code === 'log_contact') setFollowUpOpen(true);
                    else if (
                      action.code === 'accept' ||
                      action.code === 'reject' ||
                      action.code === 'record_family_approval' ||
                      action.code === 'accept_and_record_family_approval'
                    ) {
                      setDecisionAction(action.code);
                    } else if (action.code === 'reopen') setReopenOpen(true);
                    else if (action.code === 'convert_to_student') void runAction('convert_to_student');
                    else void runAction(action.code);
                  }}
                >
                  {t(actionLabelKey(action.code))}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <AdmissionQuickFollowUpDialog
        admissionId={Number(admissionId)}
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        onSuccess={() => onUpdated()}
      />
      <AdmissionModernDecisionDialog
        admissionId={Number(admissionId)}
        action={decisionAction ?? 'accept'}
        open={decisionAction != null}
        onClose={() => setDecisionAction(null)}
        onSuccess={() => onUpdated()}
      />
      <AdmissionReopenDialog
        admissionId={Number(admissionId)}
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onSuccess={() => onUpdated()}
      />
    </div>
  );
}
