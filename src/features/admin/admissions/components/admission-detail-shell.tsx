'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ApiErrorView,
  LoadingState,
  NotFoundState,
  PermissionDeniedState,
  SessionExpiredState,
} from '@/components/states/states';
import { Badge } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useAdmissionDetail } from '../hooks/use-admission-detail';
import {
  admissionStateTone,
  formatAdmissionReference,
  refName,
} from '../utils/admission-labels';
import {
  ADMISSION_TABS,
  buildAdmissionTabHref,
  parseAdmissionTab,
  type AdmissionTabId,
} from '../utils/admission-detail-tabs';
import { hasAdmissionAllowedAction } from '../utils/admission-allowed-actions';
import { AdmissionOverviewTab } from './admission-overview-tab';
import { AdmissionTimelineTab } from './admission-timeline-tab';
import { AdmissionAppointmentsTab } from './admission-appointments-tab';
import { AdmissionAssessmentsTab } from './admission-assessments-tab';
import { AdmissionDecisionTab } from './admission-decision-tab';
import { AdmissionOffersTab } from './admission-offers-tab';
import { AdmissionPrefillTab } from './admission-prefill-tab';
import { AdmissionRegistrationActions } from './admission-registration-actions';
import { AdmissionStateSelect } from './admission-state-select';
import '../admissions.css';

function isAuthError(code: string): boolean {
  return code === 'unauthenticated' || code === 'invalid_credentials';
}

function isForbiddenError(code: string): boolean {
  return code === 'forbidden' || code === 'permission_denied';
}

function DetailFact({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}) {
  return (
    <div className="admissions-detail-header__fact">
      <span className="admissions-detail-header__fact-label">{label}</span>
      <span className="admissions-detail-header__fact-value" dir={dir}>
        {value}
      </span>
    </div>
  );
}

export function AdmissionDetailShell({ admissionId }: { admissionId: string }) {
  const t = useT();
  const { formatDate } = useFormat();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, data, error, reload } = useAdmissionDetail(admissionId);
  const searchTab = searchParams.get('tab');
  const showPrefill = hasAdmissionAllowedAction(data?.allowed_actions, 'get_prefill');
  const tab = parseAdmissionTab(searchTab, showPrefill);

  useEffect(() => {
    if (!data || !searchTab || searchTab === tab) return;
    router.replace(buildAdmissionTabHref(admissionId, tab), { scroll: false });
  }, [data, searchTab, tab, admissionId, router]);

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
  const visibleTabs = showPrefill ? ADMISSION_TABS : ADMISSION_TABS.filter((id) => id !== 'prefill');
  const unspecified = t('admin.admissions.detail.unspecified');
  const nextActionParts = [detail.next_action, detail.next_action_date ? formatDate(detail.next_action_date) : '']
    .filter(Boolean)
    .join(' — ');

  function renderTab(activeTab: AdmissionTabId) {
    switch (activeTab) {
      case 'overview':
        return (
          <AdmissionOverviewTab
            detail={detail}
            canEdit={Boolean(actions.edit)}
            onUpdated={reload}
          />
        );
      case 'timeline':
        return <AdmissionTimelineTab detail={detail} onUpdated={reload} />;
      case 'appointments':
        return (
          <AdmissionAppointmentsTab
            detail={detail}
            canCreate={Boolean(actions.schedule_appointment)}
            onUpdated={reload}
          />
        );
      case 'assessments':
        return (
          <AdmissionAssessmentsTab
            detail={detail}
            canCreate={Boolean(actions.add_assessment)}
            onUpdated={reload}
          />
        );
      case 'decision':
        return (
          <AdmissionDecisionTab
            detail={detail}
            canDecide={Boolean(actions.decide)}
            onUpdated={reload}
          />
        );
      case 'offers':
        return (
          <AdmissionOffersTab
            detail={detail}
            allowedActions={actions}
            onUpdated={reload}
          />
        );
      case 'prefill':
        return <AdmissionPrefillTab admissionId={admissionId} enabled={showPrefill} />;
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
        </div>

        <div className="admissions-detail-header-card__main">
          <div className="admissions-detail-header-card__identity">
            <h1 className="admissions-detail-header-card__title">{detail.student_name}</h1>
            <div className="admissions-detail-header-card__meta">
              <span className="mono">{formatAdmissionReference(detail.id, detail.reference)}</span>
              <span className="admissions-detail-header-card__sep" aria-hidden="true">
                ·
              </span>
              {actions.edit === false ? (
                <Badge tone={admissionStateTone(detail.state)}>
                  {t(`admin.admissions.states.${detail.state}`)}
                </Badge>
              ) : (
                <AdmissionStateSelect
                  admissionId={detail.id}
                  value={detail.state}
                  onChanged={reload}
                  includeClosedStates
                  className="admission-state-select--detail"
                />
              )}
            </div>
          </div>

          <div className="admissions-detail-header-card__facts">
            <DetailFact
              label={t('admin.admissions.card.guardian')}
              value={detail.guardian_name || unspecified}
            />
            <DetailFact
              label={t('admin.admissions.card.phone')}
              value={detail.guardian_phone || unspecified}
              dir="ltr"
            />
            <DetailFact
              label={t('admin.admissions.fields.requestedLevel')}
              value={refName(detail.requested_level) || unspecified}
            />
            <DetailFact
              label={t('admin.admissions.nextAction')}
              value={nextActionParts || unspecified}
            />
          </div>
        </div>

        <AdmissionRegistrationActions detail={detail} />
      </header>

      <nav className="admissions-tabs" aria-label={t('admin.admissions.detail.tabs')}>
        {visibleTabs.map((tabId) => (
          <Link
            key={tabId}
            href={buildAdmissionTabHref(admissionId, tabId)}
            aria-current={tab === tabId ? 'page' : undefined}
          >
            {t(`admin.admissions.tabs.${tabId}`)}
          </Link>
        ))}
      </nav>

      <div className="admissions-detail-panel">{renderTab(tab)}</div>
    </div>
  );
}
