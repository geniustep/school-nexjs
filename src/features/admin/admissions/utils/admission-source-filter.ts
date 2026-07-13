import type { AdmissionOptionItem } from '@/types/admission';
import { admissionOptionId } from './admission-options';

/** Canonical display label for visit / walk-in sources (i18n key resolved by caller). */
export const DIRECT_VISIT_SOURCE_CANONICAL_CODE = 'visit';

/**
 * Treat legacy visit / walk-in source variants as one UX option.
 * Does not mutate backend records — presentation + filter matching only.
 */
export function isDirectVisitSourceOption(source: AdmissionOptionItem): boolean {
  const code = source.code?.trim().toLowerCase() ?? '';
  if (code === 'visit' || code === 'direct_visit' || code === 'walk_in') return true;
  const label = source.label.trim();
  return /visit|زيارة|visite/i.test(label);
}

export function sourceFilterMatchIds(
  sources: AdmissionOptionItem[],
  selectedId: string | undefined,
): string[] {
  if (!selectedId) return [];
  const selected = sources.find((s) => String(admissionOptionId(s) ?? '') === selectedId);
  if (!selected) return [selectedId];
  if (!isDirectVisitSourceOption(selected)) return [selectedId];
  return sources
    .filter(isDirectVisitSourceOption)
    .map((s) => String(admissionOptionId(s) ?? ''))
    .filter(Boolean);
}

export type AdmissionSourceFilterOption = {
  /** Primary option id used in the select value / URL. */
  value: string;
  /** Display label — caller may override visit variants with i18n. */
  label: string;
  /** All backend source ids that match this UX option. */
  matchIds: string[];
  isDirectVisit: boolean;
};

/**
 * Deduplicate sources for the filter select.
 * Visit / زيارة / زيارة مباشرة collapse to one option (preferred id: code=visit).
 */
export function buildAdmissionSourceFilterOptions(
  sources: AdmissionOptionItem[],
  directVisitLabel: string,
): AdmissionSourceFilterOption[] {
  const out: AdmissionSourceFilterOption[] = [];
  let visitBucket: AdmissionSourceFilterOption | null = null;

  for (const source of sources) {
    const id = admissionOptionId(source);
    if (id == null) continue;
    const value = String(id);

    if (isDirectVisitSourceOption(source)) {
      if (!visitBucket) {
        const preferred =
          sources.find((s) => s.code === DIRECT_VISIT_SOURCE_CANONICAL_CODE) ?? source;
        const preferredId = admissionOptionId(preferred);
        visitBucket = {
          value: preferredId != null ? String(preferredId) : value,
          label: directVisitLabel,
          matchIds: [],
          isDirectVisit: true,
        };
        out.push(visitBucket);
      }
      visitBucket.matchIds.push(value);
      continue;
    }

    out.push({
      value,
      label: source.label,
      matchIds: [value],
      isDirectVisit: false,
    });
  }

  return out;
}

/** Resolve select value when URL holds any legacy visit source id. */
export function resolveSourceFilterSelectValue(
  options: AdmissionSourceFilterOption[],
  selectedId: string | undefined,
): string {
  if (!selectedId) return '';
  const match = options.find((opt) => opt.matchIds.includes(selectedId) || opt.value === selectedId);
  return match?.value ?? selectedId;
}

export function sourceFilterChipLabel(
  options: AdmissionSourceFilterOption[],
  selectedId: string | undefined,
  fallback: string,
): string {
  if (!selectedId) return fallback;
  const match = options.find((opt) => opt.matchIds.includes(selectedId) || opt.value === selectedId);
  return match?.label ?? fallback;
}
