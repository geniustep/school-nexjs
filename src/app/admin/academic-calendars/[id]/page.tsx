'use client';

import { use, useMemo } from 'react';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { AcademicCalendarDetailView } from '@/features/admin/academic-calendars/components/academic-calendar-detail-view';
import { AcademicCalendarWarningReview } from '@/features/admin/academic-calendars/components/academic-calendar-warning-review';
import { normalizeAcademicCalendarDetail } from '@/features/admin/academic-calendars/utils/normalize-academic-calendar';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { AcademicCalendarDetail } from '@/types/academic-calendar';
import '@/features/admin/academic-calendars/academic-calendars.css';

export default function AdminAcademicCalendarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useAdminResource<AcademicCalendarDetail>(endpoints.admin.academicCalendar(id));
  const calendar = useMemo(
    () => (state.data ? normalizeAcademicCalendarDetail(state.data) : null),
    [state.data],
  );

  return (
    <RequireAdminPermission permission="view_timetable">
      <div className="admin-workspace">
        <ResourceView state={{ ...state, data: calendar }} loadingLabel={t('common.loading')}>
          {(detail) => (
            <>
              <AcademicCalendarWarningReview calendar={detail} />
              <AcademicCalendarDetailView calendar={detail} onReload={() => state.reload()} />
            </>
          )}
        </ResourceView>
      </div>
    </RequireAdminPermission>
  );
}
