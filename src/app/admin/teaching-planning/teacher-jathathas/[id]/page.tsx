'use client';

import { use, useMemo } from 'react';
import { ResourceView } from '@/components/states/resource';
import { TeacherJathathaReviewDetailView } from '@/features/admin/teaching-planning/components/teacher-jathatha-review-detail-view';
import { RequireTeachingPlanningAccess } from '@/features/admin/teaching-planning/components/require-teaching-planning';
import { normalizeTeacherJathathaDetail } from '@/features/admin/teaching-planning/utils/normalize-jathatha';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';

export default function AdminTeacherJathathaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const t = useT();
  const state = useAdminResource<unknown>(endpoints.admin.teacherJathathaAdmin(id));
  const item = useMemo(() => state.data ? normalizeTeacherJathathaDetail(state.data) : null, [state.data]);
  return <RequireTeachingPlanningAccess><div className="admin-workspace"><ResourceView state={{ ...state, data: item }} loadingLabel={t('common.loading')}>{(detail) => <TeacherJathathaReviewDetailView item={detail} onReload={() => state.reload()} />}</ResourceView></div></RequireTeachingPlanningAccess>;
}
