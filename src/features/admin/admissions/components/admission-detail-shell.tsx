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
import { useT } from '@/features/i18n/locale-context';
import { useAdmissionDetail } from '../hooks/use-admission-detail';
import {
  admissionStateTone,
  formatAdmissionReference,
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
import '../admissions.css';

function isAuthError(code: string): boolean {
  return code === 'unauthenticated' || code === 'invalid_credentials';
}

function isForbiddenError(code: string): boolean {
  return code === 'forbidden' || code === 'permission_denied';
}

export function AdmissionDetailShell({ admissionId }: { admissionId: string }) {
  const t = useT();
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
      <div className="admissions-detail-header">
        <div className="admissions-detail-header__main">
          <Link href="/admin/admissions" className="back-link">
            ‹ {t('admin.admissions.backToList')}
          </Link>
          <h1>{detail.student_name}</h1>
          <p className="muted">
            {formatAdmissionReference(detail.id, detail.reference)}
          </p>
          <Badge tone={admissionStateTone(detail.state)}>
            {t(`admin.admissions.states.${detail.state}`)}
          </Badge>
        </div>
        <AdmissionRegistrationActions detail={detail} />
      </div>

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

      {renderTab(tab)}
    </div>
  );
}
