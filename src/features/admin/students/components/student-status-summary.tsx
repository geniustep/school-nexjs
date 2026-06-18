'use client';

import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { resolveStudentFinanceOverviewMetrics } from '@/features/admin/student-finance/utils/resolve-student-finance-overview';
import {
  resolveFinanceOverviewStatus,
  resolveSpecialAgreementOverviewStatus,
} from '../utils/student-finance-status-summary';
import { isRelationshipActive } from '../utils/relationship-types';
import { hasCriticalHealthAlert, normalizeStudentHealthSummary } from '../utils/normalize-student-health';
import type { Student360TabId } from '../utils/student-360-tabs';
import type { StudentDetailsData } from '@/types/student-360';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';

type ReadinessTone = 'ok' | 'warn' | 'bad' | 'neutral';

type ReadinessItem = {
  key: string;
  tone: ReadinessTone;
  icon: string;
  title: string;
  value: string;
  action?: { label: string; tab?: Student360TabId; financeSubTab?: string; onClick?: () => void };
  priority: number;
};

function toneIcon(tone: ReadinessTone): string {
  if (tone === 'ok') return '●';
  if (tone === 'bad') return '!';
  if (tone === 'warn') return '!';
  return '—';
}

function toneClass(tone: ReadinessTone): string {
  return `student-readiness-item--${tone}`;
}

export function StudentStatusSummary({
  details,
  financialOverview,
  canManage,
  showDocuments,
  showHealth,
  showFinance,
  setupMode = false,
  onOpenTab,
  onEditProfile,
  onCreateAccount,
}: {
  details: StudentDetailsData;
  financialOverview?: StudentFinancialOverview | null;
  canManage: boolean;
  showDocuments: boolean;
  showHealth: boolean;
  showFinance: boolean;
  setupMode?: boolean;
  onOpenTab: (tab: Student360TabId, options?: { financeSubTab?: string }) => void;
  onEditProfile?: () => void;
  onCreateAccount?: () => void;
}) {
  const t = useT();
  const s = details.student;
  const enrollment = details.current_enrollment;
  const activeGuardians = details.guardian_relationships.filter((r) =>
    isRelationshipActive(r.state, r.active),
  );
  const docSummary = details.document_summary;
  const healthSummary = normalizeStudentHealthSummary(details.health_summary);
  const financeSummary = details.finance_summary;
  const financeMetrics = useMemo(
    () => resolveStudentFinanceOverviewMetrics(financialOverview),
    [financialOverview],
  );
  const hasAccount = !!(s.user_id || (s.account && s.account.status !== 'not_created'));

  const items = useMemo(() => {
    const rows: ReadinessItem[] = [];

    const basicComplete = Boolean(s.first_name?.trim() && s.last_name?.trim());
    rows.push({
      key: 'basic',
      tone: basicComplete ? 'ok' : 'warn',
      icon: toneIcon(basicComplete ? 'ok' : 'warn'),
      title: t('admin.student360.statusSummary.basicInfo'),
      value: basicComplete
        ? t('admin.student360.statusSummary.basicComplete')
        : t('admin.student360.statusSummary.basicIncomplete'),
      priority: basicComplete ? 3 : 0,
      action:
        !basicComplete && canManage && onEditProfile
          ? { label: t('admin.student360.readiness.actionComplete'), onClick: onEditProfile }
          : undefined,
    });

    const enrollmentValue = enrollment
      ? t('admin.student360.statusSummary.enrolled')
      : t('admin.student360.statusSummary.notEnrolled');

    rows.push({
      key: 'enrollment',
      tone: enrollment ? 'ok' : 'warn',
      icon: toneIcon(enrollment ? 'ok' : 'warn'),
      title: t('admin.student360.statusSummary.enrollment'),
      value: enrollmentValue,
      priority: enrollment ? 2 : 0,
      action: !enrollment && canManage
        ? { label: t('admin.student360.readiness.actionCreate'), onClick: onEditProfile }
        : undefined,
    });

    const guardianValue =
      activeGuardians.length === 0
        ? t('admin.student360.statusSummary.noGuardian')
        : activeGuardians.length > 1
          ? t('admin.student360.statusSummary.guardiansCount', { count: activeGuardians.length })
          : t('admin.student360.statusSummary.guardianLinked');

    rows.push({
      key: 'guardian',
      tone: activeGuardians.length > 0 ? 'ok' : 'warn',
      icon: toneIcon(activeGuardians.length > 0 ? 'ok' : 'warn'),
      title: t('admin.student360.statusSummary.guardian'),
      value: guardianValue,
      priority: activeGuardians.length > 0 ? 2 : 0,
      action:
        activeGuardians.length === 0 && canManage
          ? { label: t('admin.student360.readiness.actionAdd'), tab: 'guardians' }
          : undefined,
    });

    if (showHealth && healthSummary) {
      const hasProfile = healthSummary.has_profile === true;
      const hasCritical = hasProfile && hasCriticalHealthAlert(healthSummary);
      const tone: ReadinessTone = hasCritical ? 'bad' : hasProfile ? 'ok' : 'warn';
      rows.push({
        key: 'health',
        tone,
        icon: toneIcon(tone),
        title: t('admin.student360.statusSummary.health'),
        value: hasCritical
          ? t('admin.student360.health.criticalAlert')
          : hasProfile
            ? t('admin.student360.statusSummary.healthRecorded')
            : t('admin.student360.statusSummary.noHealth'),
        priority: tone === 'ok' ? 2 : 0,
        action: !hasProfile
          ? { label: t('admin.student360.readiness.actionCreate'), tab: 'health' }
          : hasCritical
            ? { label: t('common.view'), tab: 'health' }
            : undefined,
      });
    }

    if (showDocuments && docSummary) {
      const tone: ReadinessTone = docSummary.missing_required > 0 ? 'bad' : 'ok';
      rows.push({
        key: 'documents',
        tone,
        icon: toneIcon(tone),
        title: t('admin.student360.statusSummary.documents'),
        value:
          docSummary.missing_required > 0
            ? t('admin.student360.statusSummary.missingDocs', { count: docSummary.missing_required })
            : t('admin.student360.statusSummary.docsComplete'),
        priority: tone === 'ok' ? 2 : 0,
        action:
          docSummary.missing_required > 0
            ? { label: t('admin.student360.readiness.actionComplete'), tab: 'documents' }
            : undefined,
      });
    }

    if (showFinance) {
      const financeStatus = resolveFinanceOverviewStatus(financeSummary, t, financeMetrics);
      rows.push({
        key: 'finance-fees',
        tone: financeStatus.tone,
        icon: toneIcon(financeStatus.tone),
        title: t('admin.student360.statusSummary.financeFees'),
        value: financeStatus.status,
        priority: financeStatus.tone === 'ok' ? 2 : 0,
        action:
          financeStatus.tone !== 'ok'
            ? { label: t('common.view'), tab: 'finance' }
            : undefined,
      });

      const agreementStatus = resolveSpecialAgreementOverviewStatus(
        financialOverview?.special_agreement ?? null,
        t,
      );
      rows.push({
        key: 'finance-agreement',
        tone: agreementStatus.tone,
        icon: toneIcon(agreementStatus.tone),
        title: t('admin.student360.statusSummary.specialAgreement'),
        value: agreementStatus.status,
        priority: agreementStatus.tone === 'ok' ? 2 : 1,
        action:
          agreementStatus.tone !== 'ok'
            ? { label: t('common.view'), tab: 'finance', financeSubTab: 'agreements' as const }
            : undefined,
      });
    }

    rows.push({
      key: 'account',
      tone: hasAccount ? 'ok' : 'neutral',
      icon: toneIcon(hasAccount ? 'ok' : 'neutral'),
      title: t('admin.student360.statusSummary.account'),
      value: hasAccount
        ? t(`admin.account.status.${s.account?.status ?? 'active'}`)
        : t('admin.student360.statusSummary.noAccount'),
      priority: hasAccount ? 3 : 1,
      action:
        !hasAccount && canManage && onCreateAccount
          ? { label: t('admin.student360.readiness.actionCreate'), onClick: onCreateAccount }
          : undefined,
    });

    return rows.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title, 'ar'));
  }, [
    enrollment,
    activeGuardians,
    docSummary,
    healthSummary,
    financeSummary,
    financeMetrics,
    financialOverview?.special_agreement,
    hasAccount,
    showDocuments,
    showHealth,
    showFinance,
    canManage,
    onEditProfile,
    onCreateAccount,
    s.account?.status,
    t,
  ]);

  const pendingCount = items.filter((item) => item.tone !== 'ok').length;
  const visibleItems = setupMode ? items : items.filter((item) => item.tone !== 'ok');

  if (!setupMode && visibleItems.length === 0) {
    return (
      <section
        className="student-readiness student-readiness--complete"
        aria-label={t('admin.student360.readiness.title')}
      >
        <p className="student-readiness__complete-msg">{t('admin.student360.readiness.allCompleteDetail')}</p>
      </section>
    );
  }

  return (
    <section
      className={`student-readiness student-readiness--compact${setupMode ? ' student-readiness--setup' : ''}`}
      aria-label={setupMode ? t('admin.student360.setup.title') : t('admin.student360.readiness.title')}
    >
      <div className="student-readiness__head">
        <h2 className="student-readiness__heading">
          {setupMode ? t('admin.student360.setup.title') : t('admin.student360.readiness.title')}
        </h2>
        {pendingCount > 0 ? (
          <span className="student-readiness__meta">
            {t('admin.student360.readiness.pendingCount', { count: pendingCount })}
          </span>
        ) : (
          <span className="student-readiness__meta student-readiness__meta--ok">
            {t('admin.student360.readiness.allComplete')}
          </span>
        )}
      </div>
      <ul className="student-readiness__list student-readiness__list--grid">
        {visibleItems.map((item) => {
          const showAction = item.action && item.tone !== 'ok';
          return (
          <li key={item.key} className={`student-readiness-item ${toneClass(item.tone)}`}>
            <span className="student-readiness-item__icon" aria-hidden="true">
              {item.icon}
            </span>
            <div className="student-readiness-item__body">
              <span className="student-readiness-item__title">{item.title}</span>
              <span className={`student-readiness-item__status student-readiness-item__status--${item.tone}`}>
                {item.value}
              </span>
            </div>
            {showAction ? (
              item.action!.onClick ? (
                <button
                  type="button"
                  className="student-readiness-item__action"
                  onClick={item.action!.onClick}
                >
                  {item.action!.label}
                </button>
              ) : item.action!.tab ? (
                <button
                  type="button"
                  className="student-readiness-item__action"
                  onClick={() => {
                    if (item.action!.financeSubTab) {
                      onOpenTab('finance', { financeSubTab: item.action!.financeSubTab });
                      return;
                    }
                    onOpenTab(item.action!.tab!);
                  }}
                >
                  {item.action!.label}
                </button>
              ) : null
            ) : null}
          </li>
        );
        })}
      </ul>
    </section>
  );
}
