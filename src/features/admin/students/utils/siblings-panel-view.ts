import { parseExtraFieldBool } from '@/features/admin/admissions/utils/admission-extra-fields';
import { cleanDisplayValue } from '@/features/admin/admissions/utils/admission-labels';
import { normalizeSiblingLines } from '@/features/admin/admissions/utils/sibling-lines';
import type { SiblingsFieldsSource } from '@/types/sibling-line';

export interface SiblingsPanelView {
  /** True when the student has no usable sibling data and a clear empty state should be shown. */
  isEmpty: boolean;
  /** Sibling count to surface as a headline, only when strictly greater than zero. */
  registeredCount: number | null;
  /** Number of structured sibling lines available. */
  lineCount: number;
  /** Whether a non-technical summary text is available. */
  hasSummary: boolean;
  /** Whether legacy free-text fields (raw text / levels) carry content. */
  hasLegacyText: boolean;
  /** Whether the backend explicitly declared the student has siblings. */
  declaredHasSiblings: boolean;
  /** True when the only signal we have is the boolean flag (no count, no details). */
  flagOnly: boolean;
}

/**
 * Decides how the Student 360 siblings panel should render, independent of i18n.
 *
 * The previous UI surfaced "له إخوة: لا" / "عدد الإخوة: 0" as primary chips even when
 * the student had no siblings. This resolver collapses those weak states into a single
 * `isEmpty` signal so the panel can show a meaningful empty state instead.
 */
export function resolveSiblingsPanelView(detail: SiblingsFieldsSource): SiblingsPanelView {
  const lines = normalizeSiblingLines(detail.sibling_lines);
  const hasSummary = Boolean(cleanDisplayValue(detail.siblings_summary));
  const hasLegacyText = Boolean(
    cleanDisplayValue(detail.siblings_raw_text) || cleanDisplayValue(detail.siblings_levels),
  );
  const declaredHasSiblings = parseExtraFieldBool(detail.has_siblings);

  const rawCount = typeof detail.sibling_count === 'number' ? detail.sibling_count : null;
  const registeredCount = rawCount != null && rawCount > 0 ? rawCount : null;

  const hasDetails = lines.length > 0 || hasSummary || hasLegacyText;
  const isEmpty = !hasDetails && registeredCount == null && !declaredHasSiblings;
  const flagOnly = !hasDetails && registeredCount == null && declaredHasSiblings;

  return {
    isEmpty,
    registeredCount,
    lineCount: lines.length,
    hasSummary,
    hasLegacyText,
    declaredHasSiblings,
    flagOnly,
  };
}
