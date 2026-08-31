import type { ClassReadiness } from '@/types/class';
import type { Tone } from '@/components/ui/primitives';

export interface ClassReadinessPresentation {
  label: string;
  tone: Tone;
}

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
