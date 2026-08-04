'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ResourceView } from '@/components/states/resource';
import { EmptyState, ErrorState } from '@/components/states/states';
import { Badge, Card, DefinitionList, PageHeader, SectionHead } from '@/components/ui/primitives';
import { TeacherForm } from '@/features/admin/entity-forms';
import { useTeacherOptions } from '@/features/admin/academic-setup/hooks/use-teacher-options';
import { resolveGenderLabel } from '@/features/admin/academic-setup/utils/teacher-profile';
import {
  consumeTeacherCreateResult,
  dismissTeacherCreateResult,
} from '@/features/admin/academic-setup/utils/teacher-create';
import { resolveTeacherTypeLabelFromCode } from '@/features/admin/staff/utils/staff-center-present';
import { TeacherAcademicProfilePanel } from '@/features/admin/teachers/components/teacher-academic-profile-panel';
import { TeacherCreateReadinessBanner } from '@/features/admin/teachers/components/teacher-create-readiness-banner';
import { TeacherLifecycleDialogs } from '@/features/admin/teachers/components/teacher-lifecycle-dialogs';
import { TeacherStaffAccountSection } from '@/features/admin/teachers/components/teacher-staff-account-section';
import { fetchTeacherAcademicProfile } from '@/features/admin/teachers/api/teacher-domain-api';
import { hasAllowedAction } from '@/features/admin/teachers/utils/teacher-domain-allowed-actions';
import { mapTeacherDomainError } from '@/features/admin/teachers/utils/teacher-domain-errors';
import { normalizeTeacherDetail } from '@/features/admin/teachers/utils/teacher-domain-normalize';
import {
  teacherAccountStateLabelKey,
  teacherDisplayName,
  teacherEmploymentState,
  teacherWarningCount,
} from '@/features/admin/teachers/utils/teacher-domain-present';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useSession } from '@/features/auth/session-context';
import { canViewTeacherAdminPrivateFields } from '@/lib/auth/teacher-workspace';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import type { Teacher, TeacherCreateResult } from '@/types/teacher';
import type { TeacherAcademicProfile, TeacherDetail } from '@/types/teacher-domain';
import '@/features/admin/teachers/teachers-domain.css';

type ProfileTab =
  | 'overview'
  | 'academic'
  | 'assignments'
  | 'availability'
  | 'qualifications'
  | 'account';

type LifecycleAction = 'terminate' | 'archive' | 'reactivate' | null;

const TABS: ProfileTab[] = [
  'overview',
  'academic',
  'assignments',
  'availability',
  'qualifications',
  'account',
];

function resolveInitialTab(raw: string | null): ProfileTab {
  if (raw && (TABS as string[]).includes(raw)) return raw as ProfileTab;
  return 'overview';
}

export function TeacherProfilePage({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionUser = useSession();
  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const [tab, setTab] = useState<ProfileTab>(() =>
    resolveInitialTab(searchParams.get('tab')),
  );
  const [lifecycle, setLifecycle] = useState<LifecycleAction>(null);
  const [academic, setAcademic] = useState<TeacherAcademicProfile | null>(null);
  const [academicError, setAcademicError] = useState<string | null>(null);
  const [academicLoading, setAcademicLoading] = useState(false);
  const [createResult, setCreateResult] = useState<TeacherCreateResult | null>(null);

  const state = useAdminResource<TeacherDetail>(isNew ? null : endpoints.admin.teacher(id));
  const optionsState = useTeacherOptions(!isNew);
  const options = optionsState.options;
  const teacher = useMemo(
    () => (state.data ? normalizeTeacherDetail(state.data) : null),
    [state.data],
  );

  useEffect(() => {
    if (isNew) return;
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return;
    setCreateResult(consumeTeacherCreateResult(numericId));
  }, [id, isNew]);

  useEffect(() => {
    if (isNew || !teacher?.id) return;
    if (tab !== 'academic' && tab !== 'availability' && tab !== 'qualifications') return;
    let active = true;
    setAcademicLoading(true);
    setAcademicError(null);
    void fetchTeacherAcademicProfile(teacher.id).then((res) => {
      if (!active) return;
      setAcademicLoading(false);
      if (!res.success) {
        setAcademicError(mapTeacherDomainError(res.error, t));
        return;
      }
      setAcademic(res.data);
    });
    return () => {
      active = false;
    };
  }, [isNew, teacher?.id, tab, t]);

  if (isNew) {
    return (
      <div className="admin-workspace teacher-domain-profile">
        <Link href="/admin/teachers" className="back-link">
          ‹ {t('nav.teachers')}
        </Link>
        <PageHeader
          title={t('admin.addTeacher')}
          subtitle={t('admin.academicSetup.teacherCreate.pageSubtitle')}
        />
        <TeacherForm
          onSaved={(tid) => router.push(`/admin/teachers/${tid}`)}
          onCancel={() => router.push('/admin/teachers')}
        />
      </div>
    );
  }

  if (state.error?.code === 'forbidden' || state.error?.code === 'permission_denied') {
    return (
      <div className="admin-workspace">
        <ErrorState
          error={{ code: 'forbidden', message: t('admin.pageForbidden') }}
          onRetry={state.reload}
        />
      </div>
    );
  }

  if (state.error?.code === 'not_found' || state.error?.code === 'teacher_not_found') {
    return (
      <div className="admin-workspace">
        <EmptyState
          icon="🔎"
          title={t('admin.teacherDomain.errors.teacherNotFound')}
          description={t('admin.teacherDomain.detail.notFoundDesc')}
          action={
            <Link href="/admin/teachers" className="btn btn--primary btn--sm">
              {t('admin.teacherDomain.detail.backToList')}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="admin-workspace teacher-domain-profile">
      <Link href="/admin/teachers" className="back-link">
        ‹ {t('nav.teachers')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {() => {
          if (!teacher) return null;
          const showAdminPrivate = canViewTeacherAdminPrivateFields(sessionUser, teacher.id);
          const name = teacherDisplayName(teacher);
          const warningCount = teacherWarningCount(teacher);

          const staffUserId =
            teacher.user_id ??
            createResult?.account.user_id ??
            (teacher.account as { user_id?: number | null } | null | undefined)?.user_id ??
            null;

          return (
            <>
              {createResult ? (
                <TeacherCreateReadinessBanner
                  result={createResult}
                  staffUserId={staffUserId}
                  onDismiss={() => {
                    dismissTeacherCreateResult(teacher.id);
                    setCreateResult(null);
                  }}
                />
              ) : null}
              <PageHeader
                title={name}
                subtitle={teacher.code ?? undefined}
                actions={
                  <div className="row teacher-domain-profile__actions" style={{ gap: 8 }}>
                    <Badge
                      tone={teacherEmploymentState(teacher) === 'active' ? 'green' : 'slate'}
                    >
                      {statusLabel(t, teacherEmploymentState(teacher))}
                    </Badge>
                    <Badge tone="slate">{t(teacherAccountStateLabelKey(teacher))}</Badge>
                    {warningCount > 0 ? (
                      <Badge tone="amber">
                        {t('admin.teacherDomain.list.warningCount', { count: warningCount })}
                      </Badge>
                    ) : null}
                    {!editing && showAdminPrivate ? (
                      <>
                        {hasAllowedAction(teacher.allowed_actions, 'edit') ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => setEditing(true)}
                          >
                            {t('common.edit')}
                          </button>
                        ) : null}
                        {hasAllowedAction(teacher.allowed_actions, 'terminate') ? (
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() => setLifecycle('terminate')}
                          >
                            {t('admin.teacherDomain.lifecycle.terminate')}
                          </button>
                        ) : null}
                        {hasAllowedAction(teacher.allowed_actions, 'archive') ? (
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() => setLifecycle('archive')}
                          >
                            {t('admin.teacherDomain.lifecycle.archive')}
                          </button>
                        ) : null}
                        {hasAllowedAction(teacher.allowed_actions, 'reactivate') ? (
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            onClick={() => setLifecycle('reactivate')}
                          >
                            {t('admin.teacherDomain.lifecycle.reactivate')}
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                }
              />

              {editing ? (
                <TeacherForm
                  teacher={teacher as unknown as Teacher}
                  onSaved={() => {
                    setEditing(false);
                    state.reload();
                  }}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <>
                  <div
                    className="teacher-domain-profile__tabs"
                    role="tablist"
                    aria-label={t('admin.teacherDomain.detail.tabsLabel')}
                  >
                    {TABS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        role="tab"
                        aria-selected={tab === item}
                        className={
                          tab === item
                            ? 'teacher-domain-profile__tab teacher-domain-profile__tab--active'
                            : 'teacher-domain-profile__tab'
                        }
                        onClick={() => setTab(item)}
                      >
                        {t(`admin.teacherDomain.tabs.${item}`)}
                      </button>
                    ))}
                  </div>

                  {tab === 'overview' ? (
                    <div className="teacher-domain-profile__stack">
                      <Card>
                        <SectionHead title={t('admin.teacherDomain.tabs.overview')} />
                        <DefinitionList
                          items={[
                            { label: t('admin.fullName'), value: name },
                            { label: t('admin.code'), value: teacher.code ?? t('common.dash') },
                            {
                              label: t('admin.academicSetup.teacherForm.gender'),
                              value: resolveGenderLabel(teacher.gender, options, t),
                            },
                            {
                              label: t('admin.academicSetup.teacherForm.teacherType'),
                              value: resolveTeacherTypeLabelFromCode(teacher.teacher_type, t),
                            },
                            {
                              label: t('admin.teacherDomain.academic.specialization'),
                              value: teacher.specialization?.trim() || t('common.dash'),
                            },
                            {
                              label: t('admin.teacherDomain.columns.activeAssignments'),
                              value: String(
                                teacher.assignment_summary?.operational_count ??
                                  teacher.assignment_summary?.active_count ??
                                  0,
                              ),
                            },
                            {
                              label: t('admin.teacherDomain.columns.eligibleSubjects'),
                              value: String(
                                teacher.academic_profile_summary?.subject_eligibility_count ?? 0,
                              ),
                            },
                          ]}
                        />
                      </Card>
                    </div>
                  ) : null}

                  {tab === 'academic' || tab === 'availability' || tab === 'qualifications' ? (
                    academicLoading ? (
                      <p className="muted">{t('common.loading')}</p>
                    ) : academicError ? (
                      <ErrorState
                        error={{ code: 'server_error', message: academicError }}
                        onRetry={() => setTab(tab)}
                      />
                    ) : academic ? (
                      <TeacherAcademicProfilePanel
                        profile={academic}
                        onProfileUpdated={setAcademic}
                      />
                    ) : null
                  ) : null}

                  {tab === 'assignments' ? (
                    <Card>
                      <SectionHead
                        title={t('admin.teacherDomain.tabs.assignments')}
                        action={
                          <Link
                            href={`/admin/teaching-assignments?teacher_id=${teacher.id}`}
                            className="btn btn--ghost btn--sm"
                          >
                            {t('admin.teacherDomain.detail.openAssignments')}
                          </Link>
                        }
                      />
                      <p className="tiny muted">
                        {t('admin.teacherDomain.detail.assignmentsSummaryHint')}
                      </p>
                      <DefinitionList
                        items={[
                          {
                            label: t('admin.teacherDomain.columns.activeAssignments'),
                            value: String(
                              teacher.assignment_summary?.operational_count ??
                                teacher.assignment_summary?.active_count ??
                                0,
                            ),
                          },
                          {
                            label: t('admin.teacherDomain.detail.totalAssignments'),
                            value: String(teacher.assignment_summary?.total_count ?? 0),
                          },
                        ]}
                      />
                    </Card>
                  ) : null}

                  {tab === 'account' ? (
                    <div className="teacher-domain-profile__stack">
                      {showAdminPrivate ? (
                        <TeacherStaffAccountSection teacher={teacher as unknown as Teacher} />
                      ) : null}
                      <Card>
                        <SectionHead title={t('admin.teacherDomain.tabs.account')} />
                        <DefinitionList
                          items={[
                            {
                              label: t('admin.teacherDomain.columns.employment'),
                              value: statusLabel(t, teacherEmploymentState(teacher)),
                            },
                            {
                              label: t('admin.teacherDomain.columns.account'),
                              value: t(teacherAccountStateLabelKey(teacher)),
                            },
                            {
                              label: t('admin.teacherDomain.lifecycle.employmentEndDate'),
                              value:
                                teacher.employment?.employment_end_date ??
                                teacher.employment_end_date ??
                                t('common.dash'),
                            },
                          ]}
                        />
                      </Card>
                    </div>
                  ) : null}
                </>
              )}

              <TeacherLifecycleDialogs
                teacher={teacher}
                action={lifecycle}
                onClose={() => setLifecycle(null)}
                onSuccess={() => state.reload()}
              />
            </>
          );
        }}
      </ResourceView>
    </div>
  );
}
