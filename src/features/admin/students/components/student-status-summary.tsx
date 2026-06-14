'use client';

import { useT } from '@/features/i18n/locale-context';
import { resolveFinanceOverviewStatus } from '../utils/student-finance-status-summary';
import { isRelationshipActive } from '../utils/relationship-types';
import type { Student360TabId } from '../utils/student-360-tabs';
import type { StudentDetailsData } from '@/types/student-360';

type StatusItem = {
  key: string;
  title: string;
  status: string;
  statusTone: 'ok' | 'warn' | 'bad' | 'neutral';
  description?: string;
  action?: { label: string; tab?: Student360TabId; onClick?: () => void };
};

function toneClass(tone: StatusItem['statusTone']): string {
  if (tone === 'ok') return 'student-status-item--ok';
  if (tone === 'warn') return 'student-status-item--warn';
  if (tone === 'bad') return 'student-status-item--bad';
  return 'student-status-item--neutral';
}

export function StudentStatusSummary({
  details,
  canManage,
  showDocuments,
  showHealth,
  showFinance,
  onOpenTab,
  onEditProfile,
}: {
  details: StudentDetailsData;
  canManage: boolean;
  showDocuments: boolean;
  showHealth: boolean;
  showFinance: boolean;
  onOpenTab: (tab: Student360TabId) => void;
  onEditProfile?: () => void;
}) {
  const t = useT();
  const s = details.student;
  const enrollment = details.current_enrollment;
  const activeGuardians = details.guardian_relationships.filter((r) =>
    isRelationshipActive(r.state, r.active),
  );
  const primary = activeGuardians.find((r) => r.is_primary_contact);
  const hasContact = !!(s.phone || s.mobile || s.email);
  const docSummary = details.document_summary;
  const healthSummary = details.health_summary;
  const financeSummary = details.finance_summary;
  const hasAccount = !!(s.user_id || (s.account && s.account.status !== 'not_created'));

  const items: StatusItem[] = [
    {
      key: 'enrollment',
      title: t('admin.student360.statusSummary.enrollment'),
      status: enrollment
        ? t('admin.student360.statusSummary.enrolled')
        : t('admin.student360.statusSummary.notEnrolled'),
      statusTone: enrollment ? 'ok' : 'warn',
      description: enrollment
        ? undefined
        : t('admin.student360.statusSummary.enrollmentHint'),
      action:
        !enrollment && canManage
          ? { label: t('admin.student360.statusSummary.createEnrollment'), onClick: onEditProfile }
          : enrollment
            ? { label: t('admin.student360.statusSummary.viewEnrollment'), tab: 'enrollment' }
            : undefined,
    },
    {
      key: 'guardian',
      title: t('admin.student360.statusSummary.guardian'),
      status: primary
        ? primary.guardian.name
        : activeGuardians.length > 0
          ? t('admin.student360.statusSummary.guardiansCount', { count: activeGuardians.length })
          : t('admin.student360.statusSummary.noGuardian'),
      statusTone: activeGuardians.length > 0 ? 'ok' : 'warn',
      action:
        activeGuardians.length === 0 && canManage
          ? { label: t('admin.student360.addGuardian'), tab: 'guardians' }
          : activeGuardians.length > 0
            ? { label: t('admin.student360.statusSummary.viewGuardians'), tab: 'guardians' }
            : undefined,
    },
    {
      key: 'contact',
      title: t('admin.student360.statusSummary.contact'),
      status: hasContact
        ? [s.mobile, s.phone, s.email].filter(Boolean).join(' · ')
        : t('admin.student360.statusSummary.noContact'),
      statusTone: hasContact ? 'ok' : 'neutral',
      action:
        !hasContact && canManage && onEditProfile
          ? { label: t('admin.student360.statusSummary.addContact'), onClick: onEditProfile }
          : undefined,
    },
  ];

  if (showDocuments && docSummary) {
    items.push({
      key: 'documents',
      title: t('admin.student360.statusSummary.documents'),
      status:
        docSummary.missing_required > 0
          ? t('admin.student360.statusSummary.missingDocs', { count: docSummary.missing_required })
          : t('admin.student360.statusSummary.docsComplete'),
      statusTone: docSummary.missing_required > 0 ? 'bad' : 'ok',
      action:
        docSummary.missing_required > 0
          ? { label: t('admin.student360.documents.openTab'), tab: 'documents' }
          : { label: t('admin.student360.statusSummary.viewDocuments'), tab: 'documents' },
    });
  }

  if (showHealth && healthSummary) {
    const hasProfile = healthSummary.has_profile === true;
    const hasCritical = hasProfile && healthSummary.has_critical_alert === true;
    items.push({
      key: 'health',
      title: t('admin.student360.statusSummary.health'),
      status: hasCritical
        ? t('admin.student360.health.criticalAlert')
        : hasProfile
          ? t('admin.student360.statusSummary.healthRecorded')
          : t('admin.student360.statusSummary.noHealth'),
      statusTone: hasCritical ? 'bad' : hasProfile ? 'ok' : 'warn',
      action: !hasProfile
        ? { label: t('admin.student360.health.createProfile'), tab: 'health' }
        : { label: t('admin.student360.statusSummary.viewHealth'), tab: 'health' },
    });
  }

  if (showFinance) {
    const financeStatus = resolveFinanceOverviewStatus(financeSummary, t);
    items.push({
      key: 'finance',
      title: t('admin.student360.statusSummary.finance'),
      status: financeStatus.status,
      statusTone: financeStatus.tone,
      action: {
        label:
          financeStatus.actionTab === 'financial-agreement'
            ? t('admin.student360.statusSummary.viewAgreement')
            : t('admin.student360.statusSummary.viewFinance'),
        tab: financeStatus.actionTab,
      },
    });
  }

  items.push({
    key: 'account',
    title: t('admin.student360.statusSummary.account'),
    status: hasAccount
      ? t(`admin.account.status.${s.account?.status ?? 'active'}`)
      : t('admin.student360.statusSummary.noAccount'),
    statusTone: hasAccount ? 'ok' : 'neutral',
  });

  return (
    <section className="student-status-summary" aria-label={t('admin.student360.statusSummary.title')}>
      <h2 className="student-status-summary__heading">{t('admin.student360.statusSummary.title')}</h2>
      <ul className="student-status-summary__grid">
        {items.map((item) => (
          <li key={item.key} className={`student-status-item card ${toneClass(item.statusTone)}`}>
            <div className="student-status-item__head">
              <span className="student-status-item__title">{item.title}</span>
              <span className={`student-status-item__badge student-status-item__badge--${item.statusTone}`}>
                {item.statusTone === 'ok'
                  ? t('admin.student360.statusSummary.ok')
                  : item.statusTone === 'bad'
                    ? t('admin.student360.statusSummary.actionNeeded')
                    : item.statusTone === 'warn'
                      ? t('admin.student360.statusSummary.incomplete')
                      : t('admin.student360.statusSummary.neutral')}
              </span>
            </div>
            <p className="student-status-item__status">{item.status}</p>
            {item.description ? (
              <p className="student-status-item__desc">{item.description}</p>
            ) : null}
            {item.action ? (
              item.action.onClick ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm student-status-item__action"
                  onClick={item.action.onClick}
                >
                  {item.action.label}
                </button>
              ) : item.action.tab ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm student-status-item__action"
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
