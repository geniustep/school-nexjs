'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { TeacherCardModel } from '../types';
import { TeacherCardActions, TeacherCardContextLinks } from './teacher-card-actions';

const STATUS_TONE = {
  complete: 'green',
  needs_info: 'amber',
  no_assignment: 'amber',
  high_load: 'red',
  inactive: 'slate',
} as const;

function resolveTeacherTypeLabel(
  teacher: TeacherCardModel['teacher'],
  t: (key: string) => string,
): string | null {
  const type = teacher.teacher_type?.trim();
  if (!type) return null;
  const key = `admin.academicSetup.teacherTypes.${type}`;
  const translated = t(key);
  return translated !== key ? translated : type;
}

export function TeacherCard({
  model,
  selected,
  canManage = false,
  canManageAssignments = false,
  onView,
  onEdit,
  onManageAssignments,
  onArchive,
  onAddAssignment,
}: {
  model: TeacherCardModel;
  selected?: boolean;
  canManage?: boolean;
  canManageAssignments?: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onManageAssignments?: () => void;
  onArchive?: () => void;
  onAddAssignment?: () => void;
}) {
  const t = useT();
  const { teacher, status, assignmentCount, subjectNames } = model;
  const teacherType = resolveTeacherTypeLabel(teacher, t);
  const schoolName = teacher.school?.name ?? null;
  const hasAssignments = assignmentCount > 0;

  return (
    <article
      className={`academic-setup-teacher-card${selected ? ' academic-setup-teacher-card--selected' : ''}`}
      data-selected={selected || undefined}
    >
      <div className="academic-setup-teacher-card__head">
        <div className="between wrap" style={{ gap: 8, width: '100%' }}>
          <div className="col" style={{ gap: 4, minWidth: 0 }}>
            <strong className="academic-setup-teacher-card__name">{teacher.name}</strong>
            {teacher.specialization?.trim() ? (
              <span className="tiny muted">{teacher.specialization.trim()}</span>
            ) : null}
            {teacherType ? <span className="tiny">{teacherType}</span> : null}
          </div>
          <Badge tone={STATUS_TONE[status]}>
            {t(`admin.academicSetup.teacherStatus.${status}`)}
          </Badge>
        </div>
      </div>

      <div className="academic-setup-teacher-card__body">
        <p className="tiny muted">
          {subjectNames.length ? subjectNames.join(', ') : t('common.dash')}
        </p>
        <p className="tiny">
          {hasAssignments
            ? t('admin.academicSetup.teacherAssignmentCount', { count: assignmentCount })
            : t('admin.academicSetup.noTeachingAssignments')}
          {' · '}
          {teacher.status === 'active' || teacher.active !== false
            ? t('admin.academicSetup.accountActive')
            : t('admin.academicSetup.accountInactive')}
        </p>
        {schoolName ? <p className="tiny muted">{schoolName}</p> : null}
        {!hasAssignments ? (
          <div className="academic-setup-teacher-card__empty-action">
            {canManageAssignments && onAddAssignment ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onAddAssignment}>
                {t('admin.academicSetup.teacherForm.addAssignment')}
              </button>
            ) : (
              <span className="tiny muted">{t('admin.academicSetup.noTeachingAssignmentsHint')}</span>
            )}
          </div>
        ) : null}
      </div>

      {onView ? (
        <TeacherCardActions
          teacher={teacher}
          canManage={canManage}
          canManageAssignments={canManageAssignments}
          onView={onView}
          onEdit={onEdit}
          onManageAssignments={onManageAssignments}
          onArchive={onArchive}
        />
      ) : null}

      <TeacherCardContextLinks teacherId={teacher.id} canManageAssignments={canManageAssignments} />
    </article>
  );
}

export function TeacherCardGrid({
  models,
  selectedId,
  canManage = false,
  canManageAssignments = false,
  onView,
  onEdit,
  onManageAssignments,
  onArchive,
  onAddAssignment,
}: {
  models: TeacherCardModel[];
  selectedId?: number | null;
  canManage?: boolean;
  canManageAssignments?: boolean;
  onView?: (id: number) => void;
  onEdit?: (id: number) => void;
  onManageAssignments?: (id: number) => void;
  onArchive?: (teacher: TeacherCardModel['teacher']) => void;
  onAddAssignment?: (id: number) => void;
}) {
  return (
    <div className="academic-setup-teacher-grid">
      {models.map((model) => (
        <TeacherCard
          key={model.teacher.id}
          model={model}
          selected={selectedId === model.teacher.id}
          canManage={canManage}
          canManageAssignments={canManageAssignments}
          onView={onView ? () => onView(model.teacher.id) : undefined}
          onEdit={onEdit ? () => onEdit(model.teacher.id) : undefined}
          onManageAssignments={
            onManageAssignments ? () => onManageAssignments(model.teacher.id) : undefined
          }
          onArchive={onArchive ? () => onArchive(model.teacher) : undefined}
          onAddAssignment={onAddAssignment ? () => onAddAssignment(model.teacher.id) : undefined}
        />
      ))}
    </div>
  );
}
