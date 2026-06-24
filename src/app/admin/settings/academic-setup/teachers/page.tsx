'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState, EmptyState } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { AcademicPageHeader } from '@/features/admin/academic-setup/components/academic-page-header';
import { AcademicSearchField, AcademicToolbar } from '@/features/admin/academic-setup/components/academic-toolbar';
import { TeacherCardGrid } from '@/features/admin/academic-setup/components/teacher-card';
import { TeacherDetailDrawer } from '@/features/admin/academic-setup/components/teacher-detail-drawer';
import { TeacherFormDrawer } from '@/features/admin/academic-setup/components/teacher-form-drawer';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { useDrawerActionParam } from '@/features/admin/academic-setup/hooks/use-drawer-action-param';
import { mapTeacherApiError } from '@/features/admin/academic-setup/utils/api-errors';
import {
  academicLabelSearchHaystack,
  formatAcademicClassLabel,
} from '@/features/admin/academic-setup/utils/format-academic-label';
import { buildTeacherCards } from '@/features/admin/academic-setup/utils/summary';
import { parseNumericFilter } from '@/features/admin/academic-setup/utils/search';
import {
  canManageTeachers,
  canManageTeachingAssignments,
} from '@/lib/permissions/academic-setup';
import { api } from '@/lib/api/client';
import { useSession } from '@/features/auth/session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { SchoolClass } from '@/types/class';
import type { Teacher } from '@/types/teacher';

function teacherSearchHaystack(
  model: ReturnType<typeof buildTeacherCards>[number],
  locale: import('@/lib/i18n/config').Locale,
  classesById: Map<number, SchoolClass>,
): string {
  const { teacher } = model;
  const classLabels = (teacher.classes ?? []).map((ref) => {
    const cls = classesById.get(ref.id);
    if (!cls) return ref.name;
    return academicLabelSearchHaystack(formatAcademicClassLabel(cls, locale), [ref.name, cls.code]);
  });
  return [
    teacher.name,
    teacher.code,
    teacher.specialization,
    teacher.email,
    teacher.phone,
    teacher.status,
    teacher.teacher_type,
    ...teacher.subjects?.map((s) => s.name),
    ...classLabels,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export default function AcademicSetupTeachersPage() {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const router = useRouter();
  const user = useSession();
  const searchParams = useSearchParams();
  const lists = useAcademicSetupLists();
  const canManage = canManageTeachers(user);
  const canManageAssignments = canManageTeachingAssignments(user);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const { openFromAction, dismissActionParam } = useDrawerActionParam('add');
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editTeacherId, setEditTeacherId] = useState<number | null>(null);
  const [editInitialStep, setEditInitialStep] = useState<'profile' | 'assignments'>('profile');
  const [detailTeacherId, setDetailTeacherId] = useState<number | null>(null);
  const filterTeacherId = parseNumericFilter(searchParams, 'teacher_id') ?? parseNumericFilter(searchParams, 'teacher');

  const classesById = useMemo(() => {
    const map = new Map<number, SchoolClass>();
    for (const cls of lists.classes) map.set(cls.id, cls);
    return map;
  }, [lists.classes]);

  const editTeacher = useMemo(
    () => (editTeacherId != null ? lists.teachers.find((item) => item.id === editTeacherId) : undefined),
    [editTeacherId, lists.teachers],
  );

  const cards = useMemo(() => {
    let models = buildTeacherCards(lists.teachers);
    const q = search.trim().toLowerCase();
    if (q) {
      models = models.filter((model) => teacherSearchHaystack(model, locale, classesById).includes(q));
    }
    if (filterTeacherId) {
      models = models.filter((m) => m.teacher.id === filterTeacherId);
    }
    return models;
  }, [lists.teachers, search, filterTeacherId, locale, classesById]);

  const openEditDrawer = useCallback((id: number, step: 'profile' | 'assignments' = 'profile') => {
    setDetailTeacherId(null);
    setEditInitialStep(step);
    setEditTeacherId(id);
  }, []);

  const openDetailDrawer = useCallback((id: number) => {
    setEditTeacherId(null);
    setDetailTeacherId(id);
  }, []);

  const openAssignments = useCallback(
    (id: number) => {
      router.push(`/admin/settings/academic-setup/assignments?view=teacher&teacher_id=${id}`);
    },
    [router],
  );

  const handleArchive = useCallback(
    async (teacher: Teacher) => {
      if (!window.confirm(t('admin.confirmArchive'))) return;
      const res = await api.post(endpoints.admin.teacherArchive(teacher.id));
      if (res.success) {
        toast.success(t('admin.actionSuccess'));
        lists.reload();
      } else {
        toast.error(mapTeacherApiError(res.error, t));
      }
    },
    [lists, t, toast],
  );

  const headerActions = canManage ? (
    <button type="button" className="btn btn--primary" onClick={() => setCreateDrawerOpen(true)}>
      {t('admin.addTeacher')}
    </button>
  ) : undefined;

  if (lists.initialLoading) {
    return (
      <>
        <AcademicPageHeader title={t('admin.academicSetup.nav.teachers')} skeleton />
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (lists.error) {
    return (
      <>
        <AcademicPageHeader title={t('admin.academicSetup.nav.teachers')} />
        <ErrorState error={lists.error} onRetry={lists.reload} />
      </>
    );
  }

  return (
    <>
      <AcademicPageHeader
        title={t('admin.academicSetup.nav.teachers')}
        subtitle={t('admin.academicSetup.teachersPageSubtitle')}
        stats={t('admin.academicSetup.teachersPageStats', { count: lists.teachers.length })}
        actions={headerActions}
      />

      <AcademicToolbar>
        <AcademicSearchField
          value={search}
          onChange={setSearch}
          placeholder={t('admin.academicSetup.searchTeachersExtended')}
          label={t('admin.academicSetup.searchTeachers')}
        />
      </AcademicToolbar>

      {cards.length === 0 ? (
        <EmptyState
          title={t('admin.academicSetup.teachersEmptyTitle')}
          description={canManage ? t('admin.academicSetup.teachersEmptyDesc') : undefined}
          action={
            canManage ? (
              <button type="button" className="btn btn--primary" onClick={() => setCreateDrawerOpen(true)}>
                {t('admin.addTeacher')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <TeacherCardGrid
          models={cards}
          selectedId={filterTeacherId}
          canManage={canManage}
          canManageAssignments={canManageAssignments}
          onView={openDetailDrawer}
          onEdit={canManage ? (id) => openEditDrawer(id, 'profile') : undefined}
          onManageAssignments={canManageAssignments ? openAssignments : undefined}
          onAddAssignment={canManageAssignments ? (id) => openEditDrawer(id, 'assignments') : undefined}
          onArchive={canManage ? handleArchive : undefined}
        />
      )}

      <TeacherFormDrawer
        open={createDrawerOpen || openFromAction}
        onClose={() => {
          setCreateDrawerOpen(false);
          dismissActionParam();
        }}
        onSaved={() => lists.reload()}
      />

      <TeacherFormDrawer
        open={editTeacherId != null}
        teacher={editTeacher}
        initialStep={editInitialStep}
        onClose={() => setEditTeacherId(null)}
        onSaved={() => {
          lists.reload();
          setEditTeacherId(null);
        }}
      />

      <TeacherDetailDrawer
        open={detailTeacherId != null}
        teacherId={detailTeacherId}
        onClose={() => setDetailTeacherId(null)}
      />
    </>
  );
}
