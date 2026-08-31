import type { ClassReadiness } from '@/types/class';
import type { Tone } from '@/components/ui/primitives';

export interface ClassReadinessPresentation {
  label: string;
  tone: Tone;
}

export type ClassReadinessItemKey = keyof ClassReadiness['items'];

export interface ClassReadinessItemPresentation {
  key: ClassReadinessItemKey;
  label: string;
  ready: boolean;
}

const READINESS_ITEM_ORDER: ClassReadinessItemKey[] = [
  'capacity',
  'subjects',
  'teaching_assignments',
  'timetable',
];

const READINESS_ITEM_LABELS: Record<'ar' | 'fr', Record<ClassReadinessItemKey, string>> = {
  ar: {
    capacity: 'السعة',
    subjects: 'المواد',
    teaching_assignments: 'إسناد المدرسين',
    timetable: 'الجدول',
  },
  fr: {
    capacity: 'Capacité',
    subjects: 'Matières',
    teaching_assignments: 'Affectations pédagogiques',
    timetable: 'Emploi du temps',
  },
};

export function resolveClassReadinessPresentation(
  readiness: ClassReadiness | null | undefined,
  locale: string,
): ClassReadinessPresentation | null {
  if (!readiness) return null;

  if (readiness.status === 'ready') {
    return {
      label: locale === 'ar' ? 'جاهز' : 'Prêt',
      tone: 'green',
    };
  }

  const missing = Math.max(0, readiness.total - readiness.completed);

  if (locale === 'ar') {
    return {
      label: missing === 1 ? 'ينقصه إعداد واحد' : `ينقصه ${missing} إعدادات`,
      tone: readiness.status === 'partial' ? 'amber' : 'red',
    };
  }

  return {
    label: missing === 1 ? '1 réglage manquant' : `${missing} réglages manquants`,
    tone: readiness.status === 'partial' ? 'amber' : 'red',
  };
}

export function resolveClassReadinessItems(
  readiness: ClassReadiness | null | undefined,
  locale: string,
): ClassReadinessItemPresentation[] {
  if (!readiness) return [];

  const labels = locale === 'ar' ? READINESS_ITEM_LABELS.ar : READINESS_ITEM_LABELS.fr;
  return READINESS_ITEM_ORDER.map((key) => ({
    key,
    label: labels[key],
    ready: readiness.items[key].ready,
  }));
}
