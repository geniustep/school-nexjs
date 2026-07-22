'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useT } from '@/features/i18n/locale-context';
import type { TeacherOperationalPreset } from '@/features/admin/teachers/utils/teacher-interventions';

export type TeachersListSummaryCardId =
  | 'total'
  | 'no_assignment'
  | 'inactive_account'
  | 'incomplete_academic'
  | 'needs_intervention';

export type TeachersListSummaryCardsProps = {
  totalSchool: number | null;
  counts: {
    noAssignment: number;
    inactiveAccount: number;
    incompleteAcademic: number;
    needsIntervention: number;
  };
  compositionScope: 'full' | 'loaded_window' | 'page';
  loadedCount: number;
  windowSize: number;
  activePreset: TeacherOperationalPreset;
  disabled?: boolean;
  onSelect: (card: TeachersListSummaryCardId) => void;
};

function cardToPreset(card: TeachersListSummaryCardId): TeacherOperationalPreset {
  switch (card) {
    case 'total':
      return 'all';
    case 'no_assignment':
      return 'no_assignment';
    case 'inactive_account':
      return 'inactive_account';
    case 'incomplete_academic':
      return 'incomplete_academic_profile';
    case 'needs_intervention':
      return 'needs_intervention';
  }
}

export function TeachersListSummaryCards({
  totalSchool,
  counts,
  compositionScope,
  loadedCount,
  windowSize,
  activePreset,
  disabled = false,
  onSelect,
}: TeachersListSummaryCardsProps) {
  const t = useT();

  const scopeLabel =
    compositionScope === 'full'
      ? t('admin.teacherDomain.summary.scopeFull')
      : compositionScope === 'loaded_window'
        ? t('admin.teacherDomain.summary.scopeLoadedWindow', { count: windowSize })
        : t('admin.teacherDomain.summary.scopePage', { count: loadedCount });

  const cards: Array<{
    id: TeachersListSummaryCardId;
    label: string;
    value: number | string;
    composed: boolean;
  }> = [
    {
      id: 'total',
      label: t('admin.teacherDomain.summary.total'),
      value: totalSchool ?? t('common.dash'),
      composed: false,
    },
    {
      id: 'no_assignment',
      label: t('admin.teacherDomain.summary.noAssignment'),
      value: counts.noAssignment,
      composed: true,
    },
    {
      id: 'inactive_account',
      label: t('admin.teacherDomain.summary.inactiveAccount'),
      value: counts.inactiveAccount,
      composed: true,
    },
    {
      id: 'incomplete_academic',
      label: t('admin.teacherDomain.summary.incompleteAcademic'),
      value: counts.incompleteAcademic,
      composed: true,
    },
    {
      id: 'needs_intervention',
      label: t('admin.teacherDomain.summary.needsIntervention'),
      value: counts.needsIntervention,
      composed: true,
    },
  ];

  return (
    <section
      className="teachers-list-summary"
      aria-label={t('admin.teacherDomain.summary.regionLabel')}
    >
      <div className="teachers-list-summary__grid" role="toolbar">
        {cards.map((card) => {
          const preset = cardToPreset(card.id);
          const active = activePreset === preset;
          return (
            <button
              key={card.id}
              type="button"
              className={
                active
                  ? 'teachers-list-summary__card teachers-list-summary__card--active'
                  : 'teachers-list-summary__card'
              }
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onSelect(card.id)}
              aria-label={
                card.composed
                  ? t('admin.teacherDomain.summary.cardAriaComposed', {
                      label: card.label,
                      value: String(card.value),
                      scope: scopeLabel,
                    })
                  : t('admin.teacherDomain.summary.cardAriaTotal', {
                      label: card.label,
                      value: String(card.value),
                    })
              }
            >
              <span className="teachers-list-summary__label">{card.label}</span>
              <span className="teachers-list-summary__value" dir="ltr">
                {card.value}
              </span>
              {card.composed ? (
                <span className="teachers-list-summary__scope">{scopeLabel}</span>
              ) : (
                <span className="teachers-list-summary__scope">
                  {t('admin.teacherDomain.summary.scopeSchool')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
