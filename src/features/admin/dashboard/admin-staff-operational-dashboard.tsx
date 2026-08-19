'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Card } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT, useLocale } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { canComposeGeneralCommunication } from '@/lib/permissions/communication';
import { ADMISSION_VIEW } from '@/lib/permissions/admission';
import {
  canCollectPayments,
  canViewFinance,
  canViewPayments,
} from '@/lib/permissions/finance';
import { hasPermission } from '@/lib/permissions/permissions';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import {
  buildDashboardActionItems,
  buildDataQualityItems,
  todayIso,
} from '@/features/admin/dashboard/dashboard-interventions';
import {
  filterAdminStaffWorkspaceActionItems,
  type AdminStaffWorkspace,
} from '@/lib/admin/admin-staff-workspace';
import { cn } from '@/lib/utils/cn';
import type { AdminDashboard } from '@/types/dashboard';
import type { CurrentUser } from '@/types/user';
import {
  AdminActionList,
  AdminOperationCard,
  AdminQuickAction,
  AdminSection,
} from '@/features/admin/command-center/primitives';

type WorkspaceAction = {
  id: string;
  href: string;
  icon: string;
  label: string;
};

export function AdminStaffOperationalDashboard({
  data: d,
  user,
  workspace,
}: {
  data: AdminDashboard;
  user: CurrentUser;
  workspace: AdminStaffWorkspace;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate, formatDateTime } = useFormat();
  const { activeSchoolId, schools } = useAdminSession();

  const activeRef = schools.find((school) => school.id === activeSchoolId) ?? user.school ?? null;
  const schoolLabel = formatSchoolLabel(activeRef, t);
  const canViewAdmissions = hasPermission(user, ADMISSION_VIEW);
  const canOpenFinance = canViewFinance(user);
  const canRecordCollection = canCollectPayments(user) && canViewPayments(user);
  const canCommunicate = canComposeGeneralCommunication(user);
  const canOpenStudents = hasPermission(user, 'view_students');
  const canAddStudent = canOpenStudents && hasPermission(user, 'manage_students');

  const actionItems = useMemo(
    () =>
      filterAdminStaffWorkspaceActionItems(
        workspace,
        buildDashboardActionItems(d, t, locale),
      ),
    [d, locale, t, workspace],
  );
  const dataQualityItems = useMemo(
    () =>
      filterAdminStaffWorkspaceActionItems(
        workspace,
        buildDataQualityItems(d, t, locale),
      ),
    [d, locale, t, workspace],
  );
  const hasInterventionIssues = actionItems.length > 0 || dataQualityItems.length > 0;

  const heroActions = useMemo<WorkspaceAction[]>(() => {
    const actions: WorkspaceAction[] = [];
    if (canViewAdmissions) {
      actions.push({
        id: 'admissions',
        href: '/admin/admissions',
        icon: '📝',
        label: t('admin.executive.admissionsTitle'),
      });
    }
    if (canRecordCollection) {
      actions.push({
        id: 'collection',
        href: '/admin/finance/collections/new',
        icon: '💳',
        label: t('admin.finance.recordCollection'),
      });
    } else if (canOpenFinance) {
      actions.push({
        id: 'finance',
        href: '/admin/finance',
        icon: '💳',
        label: t('nav.finance'),
      });
    }
    if (canCommunicate) {
      actions.push({
        id: 'communication',
        href: '/admin/communication/compose',
        icon: '📣',
        label: t('communication.general.newCommunication'),
      });
    }
    return actions.slice(0, 3);
  }, [canCommunicate, canOpenFinance, canRecordCollection, canViewAdmissions, t]);

  const quickActions = useMemo<WorkspaceAction[]>(() => {
    const actions: WorkspaceAction[] = [];
    if (canViewAdmissions) {
      actions.push({
        id: 'admissions',
        href: '/admin/admissions',
        icon: '📝',
        label: t('admin.executive.openAdmissions'),
      });
    }
    if (canRecordCollection) {
      actions.push({
        id: 'record-collection',
        href: '/admin/finance/collections/new',
        icon: '💳',
        label: t('admin.finance.recordCollection'),
      });
    }
    if (canOpenFinance) {
      actions.push({
        id: 'billing-accounts',
        href: '/admin/finance/billing-accounts',
        icon: '👪',
        label: t('admin.dashboardAlerts.actions.viewBillingAccounts'),
      });
    }
    if (canAddStudent) {
      actions.push({
        id: 'add-student',
        href: '/admin/students/new',
        icon: '🎓',
        label: t('admin.addStudent'),
      });
    }
    if (canCommunicate) {
      actions.push({
        id: 'communication',
        href: '/admin/communication/compose',
        icon: '📣',
        label: t('communication.general.newCommunication'),
      });
    }
    return actions;
  }, [canAddStudent, canCommunicate, canOpenFinance, canRecordCollection, canViewAdmissions, t]);

  const structureCells = [
    hasPermission(user, 'view_students') && {
      href: '/admin/students',
      label: t('nav.students'),
      value: d.total_students,
      icon: '🎓',
    },
    hasPermission(user, 'view_parents') && {
      href: '/admin/parents',
      label: t('nav.parents'),
      value: d.total_parents,
      icon: '👪',
    },
    hasPermission(user, 'view_teachers') && {
      href: '/admin/teachers',
      label: t('nav.teachers'),
      value: d.total_teachers,
      icon: '👩‍🏫',
    },
    hasPermission(user, 'view_classes') && {
      href: '/admin/classes',
      label: t('nav.classes'),
      value: d.total_classes,
      icon: '🏫',
    },
  ].filter(Boolean) as { href: string; label: string; value: number | undefined; icon: string }[];

  const userName = user.name?.trim() ?? '';
  const hasTechnicalAdminName = !userName || /^(administrator|admin)$/i.test(userName);
  const heading = hasTechnicalAdminName
    ? t('nav.dashboard')
    : t('dashboard.welcome', { name: userName });

  return (
    <>
      <header className="director-command-hero">
        <div className="director-command-hero__glow" aria-hidden="true" />
        <div className="director-command-hero__intro">
          <span className="director-command-hero__date">{formatDate(todayIso())}</span>
          <h1 className="director-command-hero__welcome">{heading}</h1>
          <span className="director-command-hero__date">
            {t('admin.dashboardContext.variantAdminStaff')} · <span dir="auto">{schoolLabel}</span>
          </span>
        </div>

        {heroActions.length > 0 ? (
          <nav className="director-command-hero__actions" aria-label={t('common.actions')}>
            {heroActions.map((action) => (
              <Link key={action.id} href={action.href} className="director-command-hero__action">
                <span className="director-command-hero__action-icon" aria-hidden="true">
                  {action.icon}
                </span>
                <span>{action.label}</span>
              </Link>
            ))}
          </nav>
        ) : null}
      </header>

      <div
        className={cn(
          'admin-intervention-card',
          hasInterventionIssues
            ? 'admin-intervention-card--active'
            : 'admin-intervention-card--neutral',
        )}
      >
        <AdminOperationCard
          title={t('admin.cmd.interventionTitle')}
          description={
            hasInterventionIssues
              ? t('admin.cmd.interventionDesc')
              : t('admin.cmd.interventionDescNeutral')
          }
          intervention={hasInterventionIssues}
        >
          <div className="admin-intervention-section">
            <p className="admin-intervention-section__label">{t('admin.cmd.urgentSectionLabel')}</p>
            <AdminActionList items={actionItems} emptyLabel={t('admin.cmd.noInterventions')} />
          </div>

          {canOpenStudents && dataQualityItems.length > 0 ? (
            <div className="admin-intervention-dq">
              <p className="admin-intervention-section__label">{t('admin.cmd.dataQualitySectionLabel')}</p>
              <AdminActionList
                items={dataQualityItems}
                emptyLabel={t('admin.cmd.noSpecificReviewItems')}
              />
              <Link href="/admin/students" className="admin-card__secondary-link admin-intervention-dq__link">
                {t('admin.cmd.openStudentsList')}
              </Link>
            </div>
          ) : null}
        </AdminOperationCard>
      </div>

      <div className="admin-ops-grid">
        {canViewAdmissions ? (
          <AdminOperationCard
            title={t('admin.executive.admissionsTitle')}
            description={t('admin.executive.admissionsDesc')}
            footer={
              <Link className="admin-section__action" href="/admin/admissions">
                {t('admin.executive.openAdmissions')} →
              </Link>
            }
          >
            <div className="admin-quick-row">
              <AdminQuickAction
                href="/admin/admissions"
                icon="📝"
                label={t('admin.executive.openAdmissions')}
              />
              {canAddStudent ? (
                <AdminQuickAction
                  href="/admin/students/new"
                  icon="🎓"
                  label={t('admin.addStudent')}
                />
              ) : null}
            </div>
          </AdminOperationCard>
        ) : null}

        {canOpenFinance ? (
          <AdminOperationCard
            title={t('admin.director.financeTitle')}
            description={t('admin.director.financeDesc')}
            footer={
              <Link className="admin-section__action" href="/admin/finance">
                {t('admin.executive.openFinance')} →
              </Link>
            }
          >
            <div className="admin-quick-row">
              {canRecordCollection ? (
                <AdminQuickAction
                  href="/admin/finance/collections/new"
                  icon="💳"
                  label={t('admin.finance.recordCollection')}
                />
              ) : null}
              <AdminQuickAction
                href="/admin/finance/billing-accounts"
                icon="👪"
                label={t('admin.dashboardAlerts.actions.viewBillingAccounts')}
              />
            </div>
          </AdminOperationCard>
        ) : null}
      </div>

      {quickActions.length > 0 ? (
        <AdminSection title={t('admin.cmd.quickOpsTitle')}>
          <div className="admin-quick-row">
            {quickActions.map((action) => (
              <AdminQuickAction
                key={action.id}
                href={action.href}
                icon={action.icon}
                label={action.label}
              />
            ))}
          </div>
        </AdminSection>
      ) : null}

      {structureCells.length > 0 ? (
        <AdminSection title={t('admin.cmd.schoolStructureTitle')}>
          <div className="admin-quick-row">
            {structureCells.map((cell) => (
              <Link key={cell.href} href={cell.href} className="admin-quick-action">
                <span aria-hidden="true">{cell.icon}</span>
                <strong>{cell.value ?? '—'}</strong>
                <span>{cell.label}</span>
              </Link>
            ))}
          </div>
        </AdminSection>
      ) : null}

      {workspace.showLatestMessages && hasPermission(user, 'view_channels') ? (
        <AdminSection
          className="admin-section--messages"
          title={t('dashboard.latestMessages')}
          action={
            <Link className="admin-section__action" href="/admin/channels">
              {t('dashboard.allChannels')} →
            </Link>
          }
        >
          {d.latest_messages?.length ? (
            <Card pad={false}>
              <div className="msg-feed">
                {d.latest_messages.map((message) => (
                  <div key={message.id} className="msg-feed__item">
                    <div className="msg-feed__meta">
                      <span className="msg-feed__channel">{message.channel}</span>
                      <span className="msg-feed__time">{formatDateTime(message.created_at)}</span>
                    </div>
                    <div className="msg-feed__sender">{message.sender}</div>
                    <div className="msg-feed__body">{message.body}</div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <p className="admin-empty-hint">{t('empty.messages')}</p>
          )}
        </AdminSection>
      ) : null}
    </>
  );
}
