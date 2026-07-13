import type { TranslateFn } from '@/features/i18n/locale-context';
import type { TeachingPlanningAllowedActions } from '@/types/teaching-planning';

export function jathathaActivityTypeLabelKey(value: string): string {
  return `admin.teachingPlanning.jathatha.activityTypes.${value}`;
}

export function jathathaPhaseTypeLabelKey(value: string): string {
  return `admin.teachingPlanning.jathatha.phaseTypes.${value}`;
}

export function jathathaDetailLevelLabelKey(value: string): string {
  return `admin.teachingPlanning.jathatha.detailLevels.${value}`;
}

export function referenceJathathaStateLabelKey(value: string): string {
  return `admin.teachingPlanning.jathatha.referenceStates.${value}`;
}

export function teacherJathathaStateLabelKey(value: string): string {
  return `admin.teachingPlanning.jathatha.teacherStates.${value}`;
}

export function teacherJathathaReviewStateLabelKey(value: string): string {
  return `admin.teachingPlanning.jathatha.reviewStates.${value}`;
}

export function resolveJathathaErrorMessage(code: string | undefined, t: TranslateFn): string {
  if (!code) return t('admin.teachingPlanning.jathatha.errors.unknown');
  const key = `admin.teachingPlanning.jathatha.errors.${code}`;
  const translated = t(key);
  return translated === key ? t('admin.teachingPlanning.jathatha.errors.unknown') : translated;
}

export function teacherJathathaTodayCta(
  actions: TeachingPlanningAllowedActions | undefined,
  state: string | null | undefined,
): 'view' | 'create' | 'continue' | null {
  if (!actions) return null;
  if (actions.create) return 'create';
  if (actions.edit && state && !['confirmed', 'superseded', 'voided'].includes(state)) return 'continue';
  return actions.view ? 'view' : null;
}
