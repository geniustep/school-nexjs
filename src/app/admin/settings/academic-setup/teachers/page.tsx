'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState, EmptyState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { TeacherCardGrid } from '@/features/admin/academic-setup/components/teacher-card';
import { TeacherFormDrawer } from '@/features/admin/academic-setup/components/teacher-form-drawer';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { buildTeacherCards } from '@/features/admin/academic-setup/utils/summary';
import { parseNumericFilter } from '@/features/admin/academic-setup/utils/search';
import { canManageTeachers } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';

export default function AcademicSetupTeachersPage() {
  const t = useT();
  const user = useSession();
  const searchParams = useSearchParams();
  const lists = useAcademicSetupLists();
  const canManage = canManageTeachers(user);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [drawerOpen, setDrawerOpen] = useState(searchParams.get('action') === 'add');
  const filterTeacherId = parseNumericFilter(searchParams, 'teacher_id') ?? parseNumericFilter(searchParams, 'teacher');

  const cards = useMemo(() => {
    let models = buildTeacherCards(lists.teachers);
    const q = search.trim().toLowerCase();
    if (q) {
      models = models.filter(
        (m) =>
          m.teacher.name.toLowerCase().includes(q) ||
          m.subjectNames.some((s) => s.toLowerCase().includes(q)),
      );
    }
    if (filterTeacherId) {
      models = models.filter((m) => m.teacher.id === filterTeacherId);
    }
    return models;
  }, [lists.teachers, search, filterTeacherId]);

  if (lists.loading) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.teachers')} />
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (lists.error) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.teachers')} />
        <ErrorState error={lists.error} onRetry={lists.reload} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('admin.academicSetup.nav.teachers')}
        actions={
          canManage ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setDrawerOpen(true)}>
              + {t('admin.addTeacher')}
            </button>
          ) : undefined
        }
      />
      <input
        className="input"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('admin.academicSetup.searchTeachers')}
        aria-label={t('admin.academicSetup.searchTeachers')}
      />
      {cards.length === 0 ? (
        <EmptyState icon="👩‍🏫" title={t('empty.classes')} />
      ) : (
        <TeacherCardGrid models={cards} selectedId={filterTeacherId} />
      )}
      <TeacherFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => lists.reload()}
      />
    </>
  );
}
