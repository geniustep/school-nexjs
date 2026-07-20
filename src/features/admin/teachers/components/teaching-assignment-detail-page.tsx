'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ResourceView } from '@/components/states/resource';
import { EmptyState, ErrorState } from '@/components/states/states';
import { Badge, Card, DefinitionList, PageHeader, SectionHead } from '@/components/ui/primitives';
import {
  AssignmentActionDialogs,
  type AssignmentLifecycleAction,
} from '@/features/admin/teachers/components/assignment-action-dialogs';
import { hasAllowedAction } from '@/features/admin/teachers/utils/teacher-domain-allowed-actions';
import { normalizeAssignmentDetail } from '@/features/admin/teachers/utils/teacher-domain-normalize';
import { formatPlannedLoad } from '@/features/admin/teachers/utils/teacher-domain-present';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import type { TeacherAssignmentDetail } from '@/types/teacher-domain';
import '@/features/admin/teachers/teachers-domain.css';

const ACTION_ORDER: AssignmentLifecycleAction[] = [
  'activate',
  'suspend',
  'resume',
  'end',
  'cancel',
];

export function TeachingAssignmentDetailPage({ id }: { id: string }) {
  const t = useT();
  const state = useAdminResource<unknown>(endpoints.admin.teachingAssignment(id));
  const assignment = useMemo(
    () => (state.data ? normalizeAssignmentDetail(state.data) : null),
    [state.data],
  );
  const [action, setAction] = useState<AssignmentLifecycleAction>(null);

  if (state.error?.code === 'forbidden' || state.error?.code === 'permission_denied') {
    return (
      <ErrorState
        error={{ code: 'forbidden', message: t('admin.pageForbidden') }}
        onRetry={state.reload}
      />
    );
  }

  if (
    state.error?.code === 'not_found' ||
    state.error?.code === 'assignment_not_found' ||
    state.error?.code === 'teaching_assignment_not_found'
  ) {
    return (
      <EmptyState
        icon="🔎"
        title={t('admin.teacherDomain.errors.assignmentNotFound')}
        action={
          <Link href="/admin/teaching-assignments" className="btn btn--primary btn--sm">
            {t('admin.teacherDomain.detail.backToList')}
          </Link>
        }
      />
    );
  }

  return (
    <div className="admin-workspace teacher-domain-profile">
      <Link href="/admin/teaching-assignments" className="back-link">
        ‹ {t('admin.teacherDomain.assignments.title')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {() => {
          if (!assignment) return null;
          const detail = assignment as TeacherAssignmentDetail;
          return (
            <>
              <PageHeader
                title={detail.teacher?.name ?? t('admin.teacherDomain.assignments.title')}
                subtitle={`${detail.class?.name ?? '—'} · ${detail.subject?.name ?? '—'}`}
                actions={
                  <div className="row" style={{ gap: 8 }}>
                    <Badge tone={detail.state === 'active' ? 'green' : 'slate'}>
                      {statusLabel(t, detail.state ?? 'unknown')}
                    </Badge>
                    {ACTION_ORDER.filter((key) =>
                      key ? hasAllowedAction(detail.allowed_actions, key) : false,
                    ).map((key) =>
                      key ? (
                        <button
                          key={key}
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => setAction(key)}
                        >
                          {t(`admin.teacherDomain.assignmentActions.${key}`)}
                        </button>
                      ) : null,
                    )}
                  </div>
                }
              />

              <div className="teacher-domain-profile__stack">
                <Card>
                  <SectionHead title={t('admin.teacherDomain.assignmentDetail.identity')} />
                  <DefinitionList
                    items={[
                      {
                        label: t('admin.teacherDomain.assignmentColumns.teacher'),
                        value: detail.teacher?.name ?? t('common.dash'),
                      },
                      {
                        label: t('admin.teacherDomain.assignmentColumns.class'),
                        value: detail.class?.name ?? t('common.dash'),
                      },
                      {
                        label: t('admin.teacherDomain.assignmentColumns.subject'),
                        value: detail.subject?.name ?? t('common.dash'),
                      },
                      {
                        label: t('admin.teacherDomain.assignmentColumns.offering'),
                        value:
                          detail.teaching_offering?.display_name ||
                          detail.teaching_offering?.name ||
                          (detail.teaching_offering_id != null
                            ? `#${detail.teaching_offering_id}`
                            : t('common.dash')),
                      },
                      {
                        label: t('admin.teacherDomain.assignmentColumns.year'),
                        value: detail.academic_year?.name ?? t('common.dash'),
                      },
                      {
                        label: t('admin.teacherDomain.assignmentColumns.role'),
                        value: detail.role ?? t('common.dash'),
                      },
                      {
                        label: t('admin.teacherDomain.columns.plannedLoad'),
                        value: formatPlannedLoad(
                          detail.planned_weekly_load ?? detail.weekly_hours,
                          t('common.dash'),
                        ),
                      },
                      {
                        label: t('admin.teacherDomain.assignmentColumns.period'),
                        value:
                          [detail.effective_from, detail.effective_to]
                            .filter(Boolean)
                            .join(' → ') || t('common.dash'),
                      },
                    ]}
                  />
                </Card>

                {(detail.warnings?.length ||
                  detail.eligibility_warnings?.length ||
                  detail.structured_warnings?.length) ? (
                  <Card>
                    <SectionHead title={t('admin.teacherDomain.columns.warnings')} />
                    <ul className="teacher-domain-profile__list">
                      {[
                        ...(detail.warnings ?? []),
                        ...(detail.eligibility_warnings ?? []),
                        ...(detail.structured_warnings ?? []),
                      ].map((warning, index) => (
                        <li key={`${warning.code}-${index}`} dir="auto">
                          <Badge tone="amber">{warning.code}</Badge>
                          <span>{warning.message || warning.code}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ) : null}

                <Card>
                  <SectionHead title={t('admin.teacherDomain.assignmentDetail.boundaries')} />
                  <p className="tiny muted">
                    {t('admin.teacherDomain.assignmentDetail.boundariesHint')}
                  </p>
                </Card>
              </div>

              <AssignmentActionDialogs
                assignment={detail}
                action={action}
                onClose={() => setAction(null)}
                onSuccess={() => state.reload()}
              />
            </>
          );
        }}
      </ResourceView>
    </div>
  );
}
