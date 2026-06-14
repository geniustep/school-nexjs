'use client';

import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { resolveFinanceOverviewStatus } from '../utils/student-finance-status-summary';
import { isRelationshipActive, relationshipTypeLabel } from '../utils/relationship-types';
import { studentClassLabel, studentLevelLabel } from '../utils/student-academic-labels';
import type { Student360TabId } from '../utils/student-360-tabs';
import type { StudentDetailsData } from '@/types/student-360';

type ReadinessTone = 'ok' | 'warn' | 'bad' | 'neutral';

type ReadinessItem = {
  key: string;
  tone: ReadinessTone;
  icon: string;
  title: string;
  value: string;
  action?: { label: string; tab?: Student360TabId; onClick?: () => void };
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
  canManage,
  showDocuments,
  showHealth,
  showFinance,
  onOpenTab,
  onEditProfile,
  onCreateAccount,
}: {
  details: StudentDetailsData;
  canManage: boolean;
  showDocuments: boolean;
  showHealth: boolean;
  showFinance: boolean;
  onOpenTab: (tab: Student360TabId) => void;
  onEditProfile?: () => void;
  onCreateAccount?: () => void;
}) {
  const t = useT();
  const s = details.student;
  const enrollment = details.current_enrollment;
  const activeGuardians = details.guardian_relationships.filter((r) =>
    isRelationshipActive(r.state, r.active),
  );
  const primary = activeGuardians.find((r) => r.is_primary_contact);
  const docSummary = details.document_summary;
  const healthSummary = details.health_summary;
  const financeSummary = details.finance_summary;
  const hasAccount = !!(s.user_id || (s.account && s.account.status !== 'not_created'));

  const items = useMemo(() => {
    const rows: ReadinessItem[] = [];

    const enrollmentValue = enrollment
      ? [studentClassLabel(enrollment.class), studentLevelLabel(enrollment.level)]
          .filter(Boolean)
          .join(' · ') || t('admin.student360.statusSummary.enrolled')
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
        : enrollment
          ? { label: t('common.view'), tab: 'enrollment' }
          : undefined,
    });

    const guardianValue = primary
      ? `${primary.guardian.name} · ${relationshipTypeLabel(t, primary.relationship_type)}`
      : activeGuardians.length > 0
        ? t('admin.student360.statusSummary.guardiansCount', { count: activeGuardians.length })
        : t('admin.student360.statusSummary.noGuardian');

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
          : activeGuardians.length > 0
            ? { label: t('common.view'), tab: 'guardians' }
            : undefined,
    });

    if (showHealth && healthSummary) {
      const hasProfile = healthSummary.has_profile === true;
      const hasCritical = hasProfile && healthSummary.has_critical_alert === true;
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
          : { label: t('common.view'), tab: 'health' },
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
            : { label: t('common.view'), tab: 'documents' },
      });
    }

    if (showFinance) {
      const financeStatus = resolveFinanceOverviewStatus(financeSummary, t);
      rows.push({
        key: 'finance',
        tone: financeStatus.tone,
        icon: toneIcon(financeStatus.tone),
        title: t('admin.student360.statusSummary.financeAgreement'),
        value: financeStatus.status,
        priority: financeStatus.tone === 'ok' ? 2 : 0,
        action: {
          label:
            financeStatus.actionTab === 'financial-agreement' && financeStatus.tone === 'warn'
              ? t('admin.student360.readiness.actionCreate')
              : t('common.view'),
          tab: financeStatus.actionTab,
        },
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
    primary,
    docSummary,
    healthSummary,
    financeSummary,
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

  return (
    <section className="student-readiness student-readiness--compact" aria-label={t('admin.student360.readiness.title')}>
      <div className="student-readiness__head">
        <h2 className="student-readiness__heading">{t('admin.student360.readiness.title')}</h2>
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
      <ul className="student-readiness__list">
        {items.map((item) => (
          <li key={item.key} className={`student-readiness-item ${toneClass(item.tone)}`}>
            <span className="student-readiness-item__icon" aria-hidden="true">
              {item.icon}
            </span>
            <div className="student-readiness-item__body">
              <span className="student-readiness-item__title">{item.title}</span>
              <span className="student-readiness-item__sep" aria-hidden="true">
                ·
              </span>
              <span className="student-readiness-item__value" dir="auto" title={item.value}>
                {item.value}
              </span>
            </div>
            {item.action ? (
              item.action.onClick ? (
                <button
                  type="button"
                  className="student-readiness-item__action"
                  onClick={item.action.onClick}
                >
                  {item.action.label}
                </button>
              ) : item.action.tab ? (
                <button
                  type="button"
                  className="student-readiness-item__action"
                  onClick={() => onOpenTab(item.action!.tab!)}
                >
                  {item.action.label}
                </button>
              ) : null
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
