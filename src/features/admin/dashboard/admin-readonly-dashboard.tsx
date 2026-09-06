'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { PageHeader } from '@/components/ui/primitives';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { SchoolEmptyState } from '@/components/states/states';
import { useAllSchoolsCopy } from '@/features/admin/all-schools/all-schools-i18n';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { useT } from '@/features/i18n/locale-context';
import { isAllSchoolsReadMode } from '@/lib/admin/all-schools-read-mode';
import { sanitizeUserFacingErrorMessage } from '@/lib/utils/user-facing-error';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminDashboard } from '@/types/dashboard';

function safeTotal(meta: { pagination?: { total?: number } } | null | undefined): number | null {
  const t = meta?.pagination?.total;
  return typeof t === 'number' ? t : null;
}

export function AdminReadonlyDashboard() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const allSchools = isAllSchoolsReadMode(pathname, searchParams);
  const copy = useAllSchoolsCopy();
  const user = useSession();
  const { activeSchoolId } = useAdminSession();
  const t = useT();

  const fetchDashboard = hasPermission(user, 'view_dashboard');
  const dashState = useAdminResource<AdminDashboard>(
    fetchDashboard ? endpoints.admin.dashboard : null,
  );

  const studentsState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_students') ? endpoints.admin.students : null,
    { page: 1, page_size: 1 },
  );
  const classesState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_classes') ? endpoints.admin.classes : null,
    { page: 1, page_size: 1 },
  );
  const homeworksState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_homeworks') ? endpoints.admin.homeworks : null,
    { page: 1, page_size: 1 },
  );
  const resourcesState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_resources') ? endpoints.admin.resources : null,
    { page: 1, page_size: 1 },
  );
  const examsState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_exams') ? endpoints.admin.exams : null,
    { page: 1, page_size: 1 },
  );
  const resultsState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_exam_results') ? endpoints.admin.examResults : null,
    { page: 1, page_size: 1 },
  );
  const channelsState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_channels') ? endpoints.admin.channels : null,
    { page: 1, page_size: 1 },
  );

  const cards = useMemo(() => {
    const list: {
      id: string;
      label: string;
      href: string;
      icon: string;
      value: number | string;
    }[] = [];
    const d = dashState.data;

    const push = (
      id: string,
      show: boolean,
      labelKey: string,
      href: string,
      icon: string,
      value: number | string | null,
      loading: boolean,
    ) => {
      if (!show) return;
      list.push({
        id,
        label: t(labelKey),
        href,
        icon,
        value: value ?? (loading ? '…' : '—'),
      });
    };

    push(
      'students',
      hasPermission(user, 'view_students'),
      'nav.students',
      '/admin/students',
      '🎓',
      d?.total_students ?? safeTotal(studentsState.meta) ?? null,
      studentsState.loading && !studentsState.data,
    );
    push(
      'classes',
      hasPermission(user, 'view_classes'),
      'nav.classes',
      '/admin/classes',
      '🏫',
      d?.total_classes ?? safeTotal(classesState.meta) ?? null,
      classesState.loading && !classesState.data,
    );
    push(
      'attendance',
      hasPermission(user, 'view_attendance'),
      'nav.attendance',
      '/admin/attendance',
      '🗓️',
      d?.attendance_today?.total_recorded ?? d?.attendance_today?.total ?? null,
      dashState.loading && !d,
    );
    push(
      'channels',
      hasPermission(user, 'view_channels'),
      'nav.channels',
      '/admin/channels',
      '💬',
      safeTotal(channelsState.meta) ?? channelsState.data?.length ?? null,
      channelsState.loading && !channelsState.data,
    );
    push(
      'homeworks',
      hasPermission(user, 'view_homeworks'),
      'nav.homework',
      '/admin/homeworks',
      '📝',
      d?.published_homeworks ?? safeTotal(homeworksState.meta) ?? null,
      homeworksState.loading && !homeworksState.data,
    );
    push(
      'resources',
      hasPermission(user, 'view_resources'),
      'nav.resources',
      '/admin/resources',
      '📚',
      d?.published_resources ?? safeTotal(resourcesState.meta) ?? null,
      resourcesState.loading && !resourcesState.data,
    );
    push(
      'exams',
      hasPermission(user, 'view_exams'),
      'nav.exams',
      '/admin/exams',
      '📋',
      d?.upcoming_exams_count ?? safeTotal(examsState.meta) ?? null,
      examsState.loading && !examsState.data,
    );
    push(
      'results',
      hasPermission(user, 'view_exam_results'),
      'nav.examResultsNav',
      '/admin/exam-results',
      '📊',
      d?.published_exam_results_count ?? safeTotal(resultsState.meta) ?? null,
      resultsState.loading && !resultsState.data,
    );

    return list;
  }, [
    user,
    t,
    dashState,
    studentsState,
    classesState,
    homeworksState,
    resourcesState,
    examsState,
    resultsState,
    channelsState,
  ]);

  if (!cards.length) {
    return <SchoolEmptyState description={t('admin.dashboardNoPermissions')} />;
  }

  const schoolLabel = allSchools
    ? copy.allSchools
    : user.school?.name ??
      (activeSchoolId != null ? `${t('admin.activeSchool')} #${activeSchoolId}` : '');

  return (
    <>
      <PageHeader
        title={t('nav.dashboard')}
        subtitle={t('admin.readonlyDashboardDesc', { school: schoolLabel })}
      />
      {fetchDashboard && dashState.error && (
        <p className="muted mb-2">
          {sanitizeUserFacingErrorMessage(dashState.error.message, t('errors.loadFailedRetry'))}
        </p>
      )}
      <div className="admin-readonly-grid">
        {cards.map((c) => (
          <Link key={c.id} href={c.href} className="admin-readonly-card">
            <span className="admin-readonly-card__icon" aria-hidden="true">
              {c.icon}
            </span>
            <span className="admin-readonly-card__label">{c.label}</span>
            <strong className="admin-readonly-card__value">{c.value}</strong>
          </Link>
        ))}
      </div>
    </>
  );
}
