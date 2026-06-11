'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { TeacherCardModel } from '../types';

const STATUS_TONE = {
  complete: 'green',
  needs_info: 'amber',
  no_assignment: 'amber',
  high_load: 'red',
  inactive: 'slate',
} as const;

export function TeacherCard({
  model,
  selected,
  onClick,
}: {
  model: TeacherCardModel;
  selected?: boolean;
  onClick?: () => void;
}) {
  const t = useT();
  const { teacher, status, classCount, subjectNames } = model;

  return (
    <button
      type="button"
      className="academic-setup-teacher-card"
      onClick={onClick}
      data-selected={selected || undefined}
      style={selected ? { borderColor: 'var(--c-primary)' } : undefined}
    >
      <div className="between">
        <strong>{teacher.name}</strong>
        <Badge tone={STATUS_TONE[status]}>
          {t(`admin.academicSetup.teacherStatus.${status}`)}
        </Badge>
      </div>
      <p className="tiny muted">
        {subjectNames.length ? subjectNames.join(', ') : t('common.dash')}
      </p>
      <p className="tiny">
        {t('admin.academicSetup.teacherLoad', { classes: classCount })}
        {teacher.status === 'active'
          ? ` · ${t('admin.academicSetup.accountActive')}`
          : ` · ${t('admin.academicSetup.accountInactive')}`}
      </p>
    </button>
  );
}

export function TeacherCardGrid({
  models,
  selectedId,
  onSelect,
}: {
  models: TeacherCardModel[];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
}) {
  return (
    <div className="academic-setup-teacher-grid">
      {models.map((model) => (
        <TeacherCard
          key={model.teacher.id}
          model={model}
          selected={selectedId === model.teacher.id}
          onClick={onSelect ? () => onSelect(model.teacher.id) : undefined}
        />
      ))}
    </div>
  );
}
