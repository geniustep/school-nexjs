'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { Card } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { canComposeGeneralCommunication } from '@/lib/permissions/communication';
import { ADMISSION_VIEW } from '@/lib/permissions/admission';
import {
  canCollectPayments,
  canViewFinance,
  canViewPayments,
} from '@/lib/permissions/finance';
import { hasPermission } from '@/lib/permissions/permissions';
import { canSeeChannels, canSeeStudentData } from '@/lib/permissions/scope';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { normalizeFinanceOverview } from '@/lib/utils/finance-normalize';
import {
  resolveNewAdmissionsCount,
  resolveOpenAdmissionsCount,
} from '@/features/admin/admissions/utils/admissions-dashboard-cards';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  buildDashboardActionItems,
  buildDataQualityItems,
  todayIso,
} from '@/features/admin/dashboard/dashboard-interventions';
import {
  filterAdminStaffWorkspaceActionItems,
  type AdminStaffWorkspace,
  type AdminStaffWorkspaceAlertAccess,
} from '@/lib/admin/admin-staff-workspace';
import { cn } from '@/lib/utils/cn';
import type { AdmissionsDashboard } from '@/types/admission';
import type { AdminDashboard } from '@/types/dashboard';
import type { AdminFinanceOverview } from '@/types/finance';
import type { CurrentUser } from '@/types/user';
import {
  AdminActionList,
  AdminKpiStrip,
  AdminOperationCard,
  AdminQuickAction,
  AdminSchoolStrip,
  AdminSection,
  type AdminActionItem,
} from '@/features/admin/command-center/primitives';

type WorkspaceAction = {
  id: string;
  href: string;
  icon: string;
  label: string;
};

const WORKSPACE_COPY = {
  ar: {
    role: 'مساعد المدير · التسجيل والتحصيل والتواصل',
    openRegistration: 'فتح التسجيلات',
    workToday: 'عملي اليوم',
    registration: 'التسجيل',
    registrationDesc: 'طلبات التسجيل والملفات التي تحتاج متابعة.',
    registrationNew: 'جديد',
    registrationOpen: 'مفتوح',
    registrationOverdue: 'متأخر',
    registrationReady: 'جاهز للتسجيل',
    collections: 'التحصيلات',
    collectionsDesc: 'التحصيل والمتأخرات وحسابات الأسر.',
    collectedTotal: 'إجمالي التحصيل',
    overdueTotal: 'المتأخرات',
    followupFamilies: 'بحاجة للمتابعة',
    communication: 'التواصل',
    communicationDesc: 'التواصل المدرسي ومتابعة أحدث الرسائل.',
    recentMessages: 'رسائل حديثة معروضة',
    openChannels: 'فتح القنوات',
    schoolToday: 'حالة المدرسة اليوم',
    schoolTodayDesc: 'نبض تشغيلي مختصر لمساعدة المدير.',
    present: 'حاضر',
    absent: 'غائب',
    late: 'متأخر',
    recorded: 'مسجل',
    unavailable: 'غير متاح ضمن الصلاحيات الحالية',
    dataUnavailable: 'البيانات غير متاحة حاليًا',
    loading: 'جارٍ التحميل…',
  },
  en: {
    role: 'Assistant to the manager · registration, collections & communication',
    openRegistration: 'Open registrations',
    workToday: 'My work today',
    registration: 'Registration',
    registrationDesc: 'Registration requests and files that need follow-up.',
    registrationNew: 'New',
    registrationOpen: 'Open',
    registrationOverdue: 'Overdue',
    registrationReady: 'Ready to register',
    collections: 'Collections',
    collectionsDesc: 'Collections, arrears and family accounts.',
    collectedTotal: 'Total collected',
    overdueTotal: 'Overdue',
    followupFamilies: 'Need follow-up',
    communication: 'Communication',
    communicationDesc: 'School communication and recent messages.',
    recentMessages: 'Recent messages shown',
    openChannels: 'Open channels',
    schoolToday: 'School today',
    schoolTodayDesc: 'A compact operational pulse for the manager assistant.',
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    recorded: 'Recorded',
    unavailable: 'Not available with current permissions',
    dataUnavailable: 'Data is currently unavailable',
    loading: 'Loading…',
  },
  fr: {
    role: 'Assistant de direction · inscriptions, encaissements et communication',
    openRegistration: 'Ouvrir les inscriptions',
    workToday: 'Mon travail du jour',
    registration: 'Inscriptions',
    registrationDesc: 'Demandes et dossiers nécessitant un suivi.',
    registrationNew: 'Nouvelles',
    registrationOpen: 'Ouvertes',
    registrationOverdue: 'En retard',
    registrationReady: 'Prêtes à inscrire',
    collections: 'Encaissements',
    collectionsDesc: 'Encaissements, impayés et comptes des familles.',
    collectedTotal: 'Total encaissé',
    overdueTotal: 'Impayés',
    followupFamilies: 'À relancer',
    communication: 'Communication',
    communicationDesc: 'Communication scolaire et messages récents.',
    recentMessages: 'Messages récents affichés',
    openChannels: 'Ouvrir les canaux',
    schoolToday: "État de l’école aujourd’hui",
    schoolTodayDesc: 'Un aperçu opérationnel compact pour l’assistant de direction.',
    present: 'Présents',
    absent: 'Absents',
    late: 'En retard',
    recorded: 'Enregistrés',
    unavailable: 'Non disponible avec les autorisations actuelles',
    dataUnavailable: 'Données indisponibles actuellement',
    loading: 'Chargement…',
  },
  es: {
    role: 'Asistente de dirección · matrículas, cobros y comunicación',
    openRegistration: 'Abrir matrículas',
    workToday: 'Mi trabajo de hoy',
    registration: 'Matrículas',
    registrationDesc: 'Solicitudes y expedientes que necesitan seguimiento.',
    registrationNew: 'Nuevas',
    registrationOpen: 'Abiertas',
    registrationOverdue: 'Atrasadas',
    registrationReady: 'Listas para matricular',
    collections: 'Cobros',
    collectionsDesc: 'Cobros, atrasos y cuentas familiares.',
    collectedTotal: 'Total cobrado',
    overdueTotal: 'Atrasos',
    followupFamilies: 'Requieren seguimiento',
    communication: 'Comunicación',
    communicationDesc: 'Comunicación escolar y mensajes recientes.',
    recentMessages: 'Mensajes recientes mostrados',
    openChannels: 'Abrir canales',
    schoolToday: 'Estado de la escuela hoy',
    schoolTodayDesc: 'Un pulso operativo compacto para el asistente de dirección.',
    present: 'Presentes',
    absent: 'Ausentes',
    late: 'Tarde',
    recorded: 'Registrados',
    unavailable: 'No disponible con los permisos actuales',
    dataUnavailable: 'Datos no disponibles actualmente',
    loading: 'Cargando…',
  },
} as const;

function dedupeActions(items: AdminActionItem[]): AdminActionItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function buildFinanceWorkspaceAlerts(
  data: AdminFinanceOverview | null,
  t: (key: string, params?: Record<string, string | number>) => string,
): AdminActionItem[] {
  const overview = normalizeFinanceOverview(data);
  if (!overview) return [];
  const items: AdminActionItem[] = [];
  const totals = overview.totals ?? overview.summary;
  const overdue = totals?.total_overdue ?? totals?.overdue_amount;

  if (overdue != null && overdue > 0) {
    items.push({
      id: 'finance-overdue',
      label: t('admin.executive.financeOverdueAlert'),
      href: '/admin/finance/installments?status=overdue',
      icon: '💰',
      tone: 'amber',
    });
  }

  const followup = overview.followup_students ?? overview.students_needing_followup ?? [];
  if (followup.length > 0) {
    items.push({
      id: 'overdue_followup_needed',
      label: t('admin.executive.financeFollowupCount', { count: followup.length }),
      href: '/admin/finance/billing-accounts',
      icon: '📞',
      tone: 'amber',
    });
  }

  return items;
}

function buildAdmissionsWorkspaceAlerts(
  data: AdmissionsDashboard | null,
  t: (key: string, params?: Record<string, string | number>) => string,
): AdminActionItem[] {
  if (!data) return [];
  const items: AdminActionItem[] = [];

  if ((data.overdue_next_actions ?? 0) > 0) {
    items.push({
      id: 'admissions-overdue',
      label: t('admin.executive.admissionsOverdueActions', { count: data.overdue_next_actions }),
      href: '/admin/admissions',
      icon: '📝',
      tone: 'amber',
    });
  }
  if ((data.new_count ?? 0) > 0) {
    items.push({
      id: 'admissions-new',
      label: t('admin.executive.admissionsNewPending', { count: data.new_count }),
      href: '/admin/admissions?state=new',
      icon: '✨',
      tone: 'amber',
    });
  }
  if ((data.under_review_count ?? 0) > 0) {
    items.push({
      id: 'admissions-review',
      label: t('admin.executive.admissionsUnderReview', { count: data.under_review_count }),
      href: '/admin/admissions?state=under_review',
      icon: '🔍',
    });
  }
  return items;
}

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
  const copy = WORKSPACE_COPY[locale];
  const { formatDate, formatDateTime } = useFormat();
  const { activeSchoolId, schools } = useAdminSession();

  const activeRef = schools.find((school) => school.id === activeSchoolId) ?? user.school ?? null;
  const schoolLabel = formatSchoolLabel(activeRef, t);
  const canViewAdmissions = hasPermission(user, ADMISSION_VIEW);
  const canOpenFinance = canViewFinance(user);
  const canRecordCollection = canCollectPayments(user) && canViewPayments(user);
  const canCommunicate = canComposeGeneralCommunication(user);
  const canOpenChannels = canSeeChannels(user) && hasPermission(user, 'view_channels');
  const canOpenStudents = canSeeStudentData(user) && hasPermission(user, 'view_students');
  const canAddStudent = canOpenStudents && hasPermission(user, 'manage_students');
  const canViewAttendance = canSeeStudentData(user) && hasPermission(user, 'view_attendance');
  const canViewStaff = hasPermission(user, 'view_teachers');

  const admissionsQuery = useMemo(() => ({ hide_registered: 1 }), []);
  const admissionsState = useAdminResource<AdmissionsDashboard>(
    canViewAdmissions ? endpoints.admin.admissionsDashboard : null,
    admissionsQuery,
  );
  const financeState = useAdminResource<AdminFinanceOverview>(
    canOpenFinance ? endpoints.admin.financeOverview : null,
  );

  const financeOverview = useMemo(
    () => normalizeFinanceOverview(financeState.data),
    [financeState.data],
  );
  const financeTotals = financeOverview?.totals ?? financeOverview?.summary;
  const financeCurrency = financeTotals?.currency ?? financeOverview?.currency;
  const collectedTotal = financeTotals?.total_collected ?? financeTotals?.confirmed_paid ?? financeTotals?.total_paid;
  const overdueTotal = financeTotals?.total_overdue ?? financeTotals?.overdue_amount;
  const followupCount = financeOverview?.followup_students?.length ?? financeOverview?.students_needing_followup?.length ?? 0;

  const newAdmissions = resolveNewAdmissionsCount(admissionsState.data);
  const openAdmissions = resolveOpenAdmissionsCount(admissionsState.data);
  const overdueAdmissions = admissionsState.data?.overdue_next_actions;
  const readyAdmissions = admissionsState.data?.ready_for_registration_count;

  const alertAccess: AdminStaffWorkspaceAlertAccess = {
    finance: canOpenFinance,
    admissions: canViewAdmissions,
    attendance: canViewAttendance,
    students: canOpenStudents,
    staff: workspace.showOperationalStaffAlerts && canViewStaff,
  };

  const interventionItems = useMemo(() => {
    const merged = [
      ...buildDashboardActionItems(d, t, locale),
      ...buildDataQualityItems(d, t, locale),
      ...buildFinanceWorkspaceAlerts(financeState.data, t),
      ...buildAdmissionsWorkspaceAlerts(admissionsState.data, t),
    ];
    return filterAdminStaffWorkspaceActionItems(
      workspace,
      dedupeActions(merged),
      alertAccess,
    );
  }, [
    d,
    t,
    locale,
    financeState.data,
    admissionsState.data,
    workspace,
    alertAccess.finance,
    alertAccess.admissions,
    alertAccess.attendance,
    alertAccess.students,
    alertAccess.staff,
  ]);
  const hasInterventionIssues = interventionItems.length > 0;

  const heroActions = useMemo<WorkspaceAction[]>(() => {
    const actions: WorkspaceAction[] = [];
    if (canViewAdmissions) {
      actions.push({ id: 'admissions', href: '/admin/admissions', icon: '📝', label: copy.openRegistration });
    }
    if (canRecordCollection) {
      actions.push({
        id: 'collection',
        href: '/admin/finance/collections/new',
        icon: '💳',
        label: t('admin.finance.recordCollection'),
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
  }, [canCommunicate, canRecordCollection, canViewAdmissions, copy.openRegistration, t]);

  const quickActions = useMemo<WorkspaceAction[]>(() => {
    const actions: WorkspaceAction[] = [];
    if (canViewAdmissions) {
      actions.push({ id: 'admissions', href: '/admin/admissions', icon: '📝', label: copy.openRegistration });
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
      actions.push({ id: 'add-student', href: '/admin/students/new', icon: '🎓', label: t('admin.addStudent') });
    }
    if (canCommunicate) {
      actions.push({
        id: 'communication',
        href: '/admin/communication/compose',
        icon: '📣',
        label: t('communication.general.newCommunication'),
      });
    }
    if (canOpenChannels) {
      actions.push({ id: 'channels', href: '/admin/channels', icon: '💬', label: copy.openChannels });
    }
    return actions;
  }, [
    canAddStudent,
    canCommunicate,
    canOpenChannels,
    canOpenFinance,
    canRecordCollection,
    canViewAdmissions,
    copy.openChannels,
    copy.openRegistration,
    t,
  ]);

  const structureCells = [
    hasPermission(user, 'view_students') && {
      href: '/admin/students',
      label: t('nav.students'),
      value: d.total_students ?? '—',
      icon: '🎓',
    },
    hasPermission(user, 'view_parents') && {
      href: '/admin/parents',
      label: t('nav.parents'),
      value: d.total_parents ?? '—',
      icon: '👪',
    },
    hasPermission(user, 'view_teachers') && {
      href: '/admin/teachers',
      label: t('nav.teachers'),
      value: d.total_teachers ?? '—',
      icon: '👩‍🏫',
    },
    hasPermission(user, 'view_classes') && {
      href: '/admin/classes',
      label: t('nav.classes'),
      value: d.total_classes ?? '—',
      icon: '🏫',
    },
  ].filter(Boolean) as { href: string; label: string; value: number | string; icon: string }[];

  const attendance = d.attendance_today;
  const totalRecorded = attendance?.total_recorded ?? attendance?.total ?? 0;
  const recentMessageCount = canOpenChannels ? d.latest_messages?.length ?? 0 : null;

  const userName = user.name?.trim() ?? '';
  const hasTechnicalAdminName = !userName || /^(administrator|admin)$/i.test(userName);
  const heading = hasTechnicalAdminName ? t('nav.dashboard') : t('dashboard.welcome', { name: userName });

  const registrationValue = (value: number | null | undefined) => {
    if (!canViewAdmissions) return '—';
    if (admissionsState.loading) return '…';
    if (admissionsState.error || value == null) return '—';
    return value;
  };

  const financeValue = (value: number | null | undefined) => {
    if (!canOpenFinance) return '—';
    if (financeState.loading) return '…';
    if (financeState.error || value == null) return '—';
    return <FinanceMoney amount={value} currency={financeCurrency} />;
  };

  return (
    <>
      <header className="director-command-hero">
        <div className="director-command-hero__glow" aria-hidden="true" />
        <div className="director-command-hero__intro">
          <span className="director-command-hero__date">{formatDate(todayIso())}</span>
          <h1 className="director-command-hero__welcome">{heading}</h1>
          <span className="director-command-hero__date">
            {copy.role} · <span dir="auto">{schoolLabel}</span>
          </span>
        </div>
        {heroActions.length > 0 ? (
          <nav className="director-command-hero__actions" aria-label={t('common.actions')}>
            {heroActions.map((action) => (
              <Link key={action.id} href={action.href} className="director-command-hero__action">
                <span className="director-command-hero__action-icon" aria-hidden="true">{action.icon}</span>
                <span>{action.label}</span>
              </Link>
            ))}
          </nav>
        ) : null}
      </header>

      <div
        className={cn(
          'admin-intervention-card',
          hasInterventionIssues ? 'admin-intervention-card--active' : 'admin-intervention-card--neutral',
        )}
      >
        <AdminOperationCard
          title={t('admin.cmd.interventionTitle')}
          description={hasInterventionIssues ? t('admin.cmd.interventionDesc') : t('admin.cmd.interventionDescNeutral')}
          intervention={hasInterventionIssues}
        >
          <AdminActionList items={interventionItems} emptyLabel={t('admin.cmd.noInterventions')} />
        </AdminOperationCard>
      </div>

      <AdminSection title={copy.workToday}>
        <div className="admin-ops-grid">
          <AdminOperationCard
            title={copy.registration}
            description={canViewAdmissions ? copy.registrationDesc : copy.unavailable}
            footer={
              canViewAdmissions ? (
                <Link className="admin-section__action" href="/admin/admissions">{copy.openRegistration} →</Link>
              ) : undefined
            }
          >
            <AdminKpiStrip
              items={[
                { key: 'new', label: copy.registrationNew, value: registrationValue(newAdmissions), tone: 'blue' },
                { key: 'open', label: copy.registrationOpen, value: registrationValue(openAdmissions) },
                { key: 'overdue', label: copy.registrationOverdue, value: registrationValue(overdueAdmissions), tone: 'amber' },
                { key: 'ready', label: copy.registrationReady, value: registrationValue(readyAdmissions), tone: 'green' },
              ]}
            />
          </AdminOperationCard>

          <AdminOperationCard
            title={copy.collections}
            description={canOpenFinance ? copy.collectionsDesc : copy.unavailable}
            footer={
              canOpenFinance ? (
                <Link className="admin-section__action" href="/admin/finance/collections">{t('admin.executive.openFinance')} →</Link>
              ) : undefined
            }
          >
            <AdminKpiStrip
              items={[
                { key: 'collected', label: copy.collectedTotal, value: financeValue(collectedTotal), tone: 'green' },
                { key: 'overdue', label: copy.overdueTotal, value: financeValue(overdueTotal), tone: overdueTotal != null && overdueTotal > 0 ? 'red' : undefined },
                { key: 'followup', label: copy.followupFamilies, value: canOpenFinance ? (financeState.loading ? '…' : followupCount) : '—', tone: followupCount > 0 ? 'amber' : undefined },
              ]}
            />
          </AdminOperationCard>

          <AdminOperationCard
            title={copy.communication}
            description={canOpenChannels || canCommunicate ? copy.communicationDesc : copy.unavailable}
            footer={
              canOpenChannels ? (
                <Link className="admin-section__action" href="/admin/channels">{copy.openChannels} →</Link>
              ) : undefined
            }
          >
            <AdminKpiStrip
              items={[
                { key: 'recent', label: copy.recentMessages, value: recentMessageCount ?? '—', tone: 'blue' },
              ]}
            />
            <div className="admin-quick-row">
              {canCommunicate ? (
                <AdminQuickAction href="/admin/communication/compose" icon="📣" label={t('communication.general.newCommunication')} />
              ) : null}
              {canOpenChannels ? (
                <AdminQuickAction href="/admin/channels" icon="💬" label={copy.openChannels} />
              ) : null}
            </div>
          </AdminOperationCard>
        </div>
      </AdminSection>

      {workspace.showAttendanceOperations && canViewAttendance ? (
        <AdminSection title={copy.schoolToday}>
          <AdminOperationCard
            title={t('nav.attendance')}
            description={copy.schoolTodayDesc}
            footer={
              <Link className="admin-section__action" href="/admin/attendance?date=today">{t('admin.cmd.openAttendance')} →</Link>
            }
          >
            <AdminKpiStrip
              items={[
                { key: 'present', label: copy.present, value: attendance?.present ?? '—', tone: 'green' },
                { key: 'absent', label: copy.absent, value: attendance?.absent ?? '—', tone: 'red' },
                { key: 'late', label: copy.late, value: attendance?.late ?? '—', tone: 'amber' },
                { key: 'recorded', label: copy.recorded, value: attendance ? totalRecorded : '—', tone: 'blue' },
              ]}
            />
          </AdminOperationCard>
        </AdminSection>
      ) : null}

      {quickActions.length > 0 ? (
        <AdminSection title={t('admin.cmd.quickOpsTitle')}>
          <div className="admin-quick-row">
            {quickActions.map((action) => (
              <AdminQuickAction key={action.id} href={action.href} icon={action.icon} label={action.label} />
            ))}
          </div>
        </AdminSection>
      ) : null}

      {workspace.showLatestMessages && canOpenChannels ? (
        <AdminSection
          className="admin-section--messages"
          title={t('dashboard.latestMessages')}
          action={<Link className="admin-section__action" href="/admin/channels">{t('dashboard.allChannels')} →</Link>}
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

      {structureCells.length > 0 ? (
        <AdminSection title={t('admin.cmd.schoolStructureTitle')}>
          <AdminSchoolStrip cells={structureCells} />
        </AdminSection>
      ) : null}
    </>
  );
}
