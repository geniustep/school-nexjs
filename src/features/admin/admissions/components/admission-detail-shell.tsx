'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ApiErrorView,
  LoadingState,
  NotFoundState,
  PermissionDeniedState,
  SessionExpiredState,
} from '@/components/states/states';
import { Badge } from '@/components/ui/primitives';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { useAdmissionDetail } from '../hooks/use-admission-detail';
import {
  cleanDisplayValue,
  formatAdmissionReference,
  refName,
} from '../utils/admission-labels';
import {
  ADMISSION_TABS,
  buildAdmissionTabHref,
  parseAdmissionTab,
  type AdmissionTabId,
} from '../utils/admission-detail-tabs';
import {
  canEditAdmissionDetail,
  hasAdmissionAllowedAction,
} from '../utils/admission-allowed-actions';
import { isAdmissionConvertedToStudent } from '../utils/admission-registration';
import { AdmissionOverviewTab } from './admission-overview-tab';
import { AdmissionTimelineTab } from './admission-timeline-tab';
import { AdmissionDecisionTab } from './admission-decision-tab';
import { AdmissionAssessmentsAppointmentsTab } from './admission-assessments-appointments-tab';
import { AdmissionOfferRegistrationTab } from './admission-offer-registration-tab';
import { FamilyAdmissionFamilyPanel } from './family-admission-family-panel';
import { hasFamilyBatchLink } from '../utils/family-admission-visibility';
import { AdmissionRejectionBanner } from './admission-rejection-banner';
import { AdmissionPrimaryActionPanel } from './admission-primary-action-panel';
import { AdmissionStudentConversionAction } from './admission-student-conversion-action';
import { AdmissionModernStatusBadge } from './admission-modern-status-badge';
import { AdmissionLastActionSummary } from './admission-last-action-summary';
import { OverviewEmptyValue } from './admission-overview-primitives';
import {
  AdmissionGuardiansDetails,
  normalizeAdmissionGuardiansForDisplay,
} from '@/features/admin/admissions/guardians';
import {
  normalizeStatusWarnings,
  statusWarningLabelKey,
} from '../utils/admission-status-display';
import { hasModernContract } from '../utils/admission-modern-actions';
import { resolveApplicationStatus } from '../utils/admission-modern-status';
import '../admissions.css';

function isAuthError(code: string): boolean {
  return code === 'unauthenticated' || code === 'invalid_credentials';
}

function isForbiddenError(code: string): boolean {
  return code === 'forbidden' || code === 'permission_denied';
}

type FactIcon = 'guardian' | 'phone' | 'level' | 'family';

function FactGlyph({ icon }: { icon: FactIcon }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (icon) {
    case 'guardian':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...common}>
          <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L19 13l-1 6h-2A13 13 0 0 1 5 6Z" />
        </svg>
      );
    case 'level':
      return (
        <svg {...common}>
          <path d="M3 8l9-4 9 4-9 4Z" />
          <path d="M7 11v4c0 1.5 2.5 3 5 3s5-1.5 5-3v-4" />
        </svg>
      );
    case 'family':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="2.5" />
          <circle cx="16" cy="9" r="2" />
          <path d="M3 19a6 6 0 0 1 12 0" />
          <path d="M13 19a5 5 0 0 1 8 0" />
        </svg>
      );
    default:
      return null;
  }
}

function DetailFact({
  label,
  value,
  dir,
  icon,
  empty,
}: {
  label: string;
  value: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  icon: FactIcon;
  empty?: boolean;
}) {
  return (
    <div className="admissions-detail-fact">
      <span className="admissions-detail-fact__icon" aria-hidden="true">
        <FactGlyph icon={icon} />
      </span>
      <span className="admissions-detail-fact__body">
        <span className="admissions-detail-fact__label">{label}</span>
        <span
          className={`admissions-detail-fact__value${empty ? ' admissions-detail-fact__value--empty' : ''}`}
          dir={dir}
        >
          {empty ? <OverviewEmptyValue /> : value}
        </span>
      </span>
    </div>
  );
}

function studentInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '—';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  const initials = (first + last).trim();
  return initials || '—';
}

function AdmissionWarningsCompact({
  warnings,
  admissionId,
}: {
  warnings: string[];
  admissionId: string;
}) {
  const t = useT();
  if (warnings.length === 0) return null;
  const top = warnings.slice(0, 2);
  return (
    <div
      className="admission-warnings-compact"
      role="status"
      data-testid="admission-warnings-compact"
    >
      <p className="admission-warnings-compact__title">
        {t('admin.admissions.statusWarnings.compactTitle', { count: warnings.length })}
      </p>
      <ul>
        {top.map((code) => {
          const key = statusWarningLabelKey(code);
          const label = t(key);
          return <li key={code}>{label !== key ? label : code}</li>;
        })}
      </ul>
      <Link
        href={buildAdmissionTabHref(admissionId, 'family_data')}
        className="btn btn--ghost btn--sm"
      >
        {t('admin.admissions.primaryAction.reviewData')}
      </Link>
    </div>
  );
}

export function AdmissionDetailShell({ admissionId }: { admissionId: string }) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSession();
  const { loading, data, error, reload } = useAdmissionDetail(admissionId);
  const searchTab = searchParams.get('tab');
  const tab = parseAdmissionTab(searchTab);
  const [editRequestSeq, setEditRequestSeq] = useState(0);
  const [pendingEditRequest, setPendingEditRequest] = useState(false);

  useEffect(() => {
    if (!data || !searchTab || searchTab === tab) return;
    router.replace(buildAdmissionTabHref(admissionId, tab), { scroll: false });
  }, [data, searchTab, tab, admissionId, router]);

  useEffect(() => {
    if (!pendingEditRequest || tab !== 'summary') return;
    setEditRequestSeq((seq) => seq + 1);
    setPendingEditRequest(false);
  }, [pendingEditRequest, tab]);

  function requestLimitedEdit() {
    if (tab !== 'summary') {
      setPendingEditRequest(true);
      router.push(buildAdmissionTabHref(admissionId, 'summary'), { scroll: false });
      return;
    }
    setEditRequestSeq((seq) => seq + 1);
  }

  if (loading && !data) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (error) {
    if (isAuthError(error.code)) return <SessionExpiredState />;
    if (isForbiddenError(error.code)) return <PermissionDeniedState />;
    if (error.code === 'not_found') return <NotFoundState description={t('admin.admissions.errors.notFound')} />;
    return <ApiErrorView error={error} onRetry={reload} />;
  }

  if (!data) return <NotFoundState description={t('admin.admissions.errors.notFound')} />;

  const detail = data;
  const actions = detail.allowed_actions ?? {};
  const canEdit = canEditAdmissionDetail(actions, user);
  const convertedToStudent = isAdmissionConvertedToStudent(detail);
  const isFamily = hasFamilyBatchLink(detail);
  const warnings = normalizeStatusWarnings(detail.status_warnings);

  const primaryGuardian =
    normalizeAdmissionGuardiansForDisplay({
      guardians: detail.guardians,
      legacyFlat: {
        guardian_name: detail.guardian_name,
        guardian_phone: detail.guardian_phone,
        guardian_whatsapp: detail.guardian_whatsapp,
        guardian_email: detail.guardian_email,
        relationship: detail.relationship,
      },
    }).find((g) => g.isPrimaryContact) ?? null;
  const headerGuardianName =
    cleanDisplayValue(primaryGuardian?.name) || cleanDisplayValue(detail.guardian_name);
  const headerGuardianPhone =
    cleanDisplayValue(primaryGuardian?.phone) || cleanDisplayValue(detail.guardian_phone);

  function renderTab(activeTab: AdmissionTabId) {
    switch (activeTab) {
      case 'summary':
        return (
          <AdmissionOverviewTab
            detail={detail}
            canEdit={canEdit}
            editRequestSeq={editRequestSeq}
            onUpdated={reload}
          />
        );
      case 'family_data':
        return (
          <div className="admission-family-data-tab" data-testid="admission-tab-family-data">
            {isFamily && detail.family_batch_id ? (
              <FamilyAdmissionFamilyPanel
                batchId={detail.family_batch_id}
                currentAdmissionId={detail.id}
                familyReference={detail.family_reference}
                familySize={detail.family_size}
                onBatchUpdated={reload}
              />
            ) : (
              <AdmissionGuardiansDetails
                mode="individual"
                guardians={detail.guardians}
                sharedContact={null}
                legacyFlat={{
                  guardian_name: detail.guardian_name,
                  guardian_phone: detail.guardian_phone,
                  guardian_whatsapp: detail.guardian_whatsapp,
                  guardian_email: detail.guardian_email,
                  relationship: detail.relationship,
                }}
              />
            )}
          </div>
        );
      case 'assessments_appointments':
        return (
          <AdmissionAssessmentsAppointmentsTab
            detail={detail}
            canCreateAppointment={hasAdmissionAllowedAction(actions, 'schedule_appointment')}
            canCreateAssessment={hasAdmissionAllowedAction(actions, 'add_assessment')}
            onUpdated={reload}
          />
        );
      case 'decision':
        return (
          <AdmissionDecisionTab
            detail={detail}
            canDecide={hasAdmissionAllowedAction(actions, 'decide')}
            onUpdated={reload}
          />
        );
      case 'offer_registration':
        return <AdmissionOfferRegistrationTab detail={detail} onUpdated={reload} />;
      case 'history':
        return <AdmissionTimelineTab detail={detail} onUpdated={reload} />;
      default:
        return null;
    }
  }

  return (
    <div className="admissions-detail-shell">
      <header className="card admissions-detail-header-card">
        <div className="admissions-detail-header-card__top">
          <Link href="/admin/admissions" className="btn btn--ghost btn--sm admissions-detail-header-card__back">
            {t('admin.admissions.backToList')}
          </Link>
          <AdmissionStudentConversionAction detail={detail} onUpdated={reload} />
          {convertedToStudent ? (
            <div className="admissions-detail-header-card__converted">
              <Badge tone="green">{t('admin.admissions.registration.convertedStatus')}</Badge>
            </div>
          ) : null}
        </div>

        <div className="admissions-detail-header-card__main">
          <div
            className={`admissions-detail-header-card__avatar${
              convertedToStudent ? ' admissions-detail-header-card__avatar--converted' : ''
            }`}
            aria-hidden="true"
          >
            {studentInitials(detail.student_name)}
          </div>
          <div className="admissions-detail-header-card__identity">
            <h1 className="admissions-detail-header-card__title">{detail.student_name}</h1>
            <div className="admissions-detail-header-card__meta">
              <span className="admissions-detail-header-card__ref mono">
                {formatAdmissionReference(detail.id, detail.reference)}
              </span>
              <Badge tone={isFamily ? 'blue' : 'slate'}>
                {isFamily
                  ? t('admin.admissions.family.badgeShort')
                  : t('admin.admissions.detail.individualType')}
              </Badge>
            </div>
          </div>
        </div>

        <div className="admissions-detail-header-card__facts">
          <DetailFact
            icon="guardian"
            label={t('admin.admissions.card.guardian')}
            value={headerGuardianName}
            empty={!headerGuardianName}
          />
          <DetailFact
            icon="phone"
            label={t('admin.admissions.card.phone')}
            value={headerGuardianPhone}
            dir="ltr"
            empty={!headerGuardianPhone}
          />
          <DetailFact
            icon="level"
            label={t('admin.admissions.fields.requestedLevel')}
            value={refName(detail.requested_level)}
            empty={!refName(detail.requested_level)}
          />
          {isFamily ? (
            <DetailFact
              icon="family"
              label={t('admin.admissions.family.detailPanelTitle')}
              value={
                detail.family_reference
                  ? String(detail.family_reference)
                  : t('admin.admissions.family.badgeShort')
              }
            />
          ) : null}
        </div>

        <AdmissionRejectionBanner detail={detail} onUpdated={reload} />

        {hasModernContract(detail) ? (
          <div
            className="admission-detail-modern-summary"
            data-testid="admission-detail-modern-summary"
          >
            <div className="admission-detail-modern-summary__status">
              <span className="muted tiny">{t('admin.admissions.table.state')}</span>
              <AdmissionModernStatusBadge record={detail} />
              {resolveApplicationStatus(detail) === 'accepted' ? (
                <p className="muted tiny">{t('admin.admissions.applicationStatus.accepted')}</p>
              ) : null}
              {resolveApplicationStatus(detail) === 'ready_for_registration' ? (
                <p className="muted tiny">
                  {t('admin.admissions.applicationStatus.ready_for_registration')}
                </p>
              ) : null}
            </div>
            <div className="admission-detail-modern-summary__last">
              <span className="muted tiny">{t('admin.admissions.lastAction.label')}</span>
              <AdmissionLastActionSummary action={detail.last_action} showDetails />
            </div>
          </div>
        ) : null}

        <AdmissionPrimaryActionPanel
          detail={detail}
          admissionId={admissionId}
          onUpdated={() => reload()}
          onRequestEdit={canEdit ? requestLimitedEdit : undefined}
        />

        <AdmissionWarningsCompact warnings={warnings} admissionId={admissionId} />
      </header>

      <nav className="admissions-tabs" aria-label={t('admin.admissions.detail.tabs')}>
        <div className="admissions-tabs__track">
          {ADMISSION_TABS.map((tabId) => (
            <Link
              key={tabId}
              href={buildAdmissionTabHref(admissionId, tabId)}
              aria-current={tab === tabId ? 'page' : undefined}
              className="admissions-tabs__tab"
            >
              {t(`admin.admissions.tabs.${tabId}`)}
            </Link>
          ))}
        </div>
      </nav>

      <div className="admissions-detail-panel card">{renderTab(tab)}</div>
    </div>
  );
}
