'use client';

import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { TeacherSuggestion } from '../types';

export function TeacherSuggestionList({
  suggestions,
  selectedTeacherId,
  onSelect,
  onConfirm,
  canConfirm,
}: {
  suggestions: TeacherSuggestion[];
  selectedTeacherId?: number | null;
  onSelect?: (teacherId: number) => void;
  onConfirm?: (teacherId: number) => void;
  canConfirm: boolean;
}) {
  const t = useT();
  const eligible = suggestions.filter((s) => s.tier !== 'ineligible');

  if (!eligible.length) {
    return <p className="muted tiny">{t('admin.academicSetup.noSuggestions')}</p>;
  }

  return (
    <div className="col" style={{ gap: 10 }}>
      {eligible.slice(0, 8).map(({ teacher, tier, reasons, classCount, teachesSubject }) => (
        <button
          key={teacher.id}
          type="button"
          className="academic-setup-class-row"
          onClick={() => onSelect?.(teacher.id)}
          data-selected={selectedTeacherId === teacher.id || undefined}
        >
          <span>
            <strong>{teacher.name}</strong>
            <span className="tiny muted block mt-2">
              {teacher.subjects?.map((s) => s.name).join(', ') || t('common.dash')}
              {' · '}
              {t('admin.academicSetup.teacherLoad', { classes: classCount })}
            </span>
            <span className="tiny muted block">{reasons.join(' · ')}</span>
          </span>
          <span className={cn('academic-setup-suggest-tier', `academic-setup-suggest-tier--${tier}`)}>
            {t(`admin.academicSetup.suggestTier.${tier}`)}
          </span>
        </button>
      ))}
      {canConfirm && selectedTeacherId && onConfirm && (
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => onConfirm(selectedTeacherId)}
        >
          {t('admin.academicSetup.confirmAssignment')}
        </button>
      )}
      {!canConfirm && (
        <p className="academic-setup-gap-banner">{t('admin.academicSetup.assignmentsMutationGap')}</p>
      )}
    </div>
  );
}
