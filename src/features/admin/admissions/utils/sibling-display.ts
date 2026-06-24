import { cleanDisplayValue } from '@/features/admin/admissions/utils/admission-labels';
import type { SiblingLine, SiblingsFieldsSource } from '@/types/sibling-line';

const TECHNICAL_SUMMARY_RE = /\d+\s+(\d{4}\s+)?siblings\s*:/i;

export function isTechnicalSiblingSummary(value: string | null | undefined): boolean {
  const text = cleanDisplayValue(value);
  if (!text) return false;
  return TECHNICAL_SUMMARY_RE.test(text) || /^siblings\s*:/i.test(text);
}

export function hasMeaningfulSiblingLegacyText(value: string | null | undefined): boolean {
  return Boolean(cleanDisplayValue(value));
}

export function localizeSiblingRelationship(
  t: (key: string) => string,
  value: string | null | undefined,
): string | null {
  const normalized = cleanDisplayValue(value);
  if (!normalized) return null;
  const key = `admin.siblings.relationship.${normalized}`;
  const translated = t(key);
  return translated !== key ? translated : normalized;
}

export function localizeSiblingSummary(
  summary: string | null | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
): string | null {
  const text = cleanDisplayValue(summary);
  if (!text) return null;

  let match = text.match(/^(\d+)\s+(\d{4})\s+siblings\s*:\s*(.+)$/i);
  if (match) {
    return t('admin.siblings.summaryTechnicalWithYear', {
      count: Number(match[1]),
      year: match[2],
      names: match[3].trim(),
    });
  }

  match = text.match(/^(\d+)\s+siblings\s*:\s*(.+)$/i);
  if (match) {
    const rest = match[2].trim();
    const yearSplit = rest.match(/^(\d{4})\s*[-–]\s*(.+)$/);
    if (yearSplit) {
      return t('admin.siblings.summaryTechnicalWithYear', {
        count: Number(match[1]),
        year: yearSplit[1],
        names: yearSplit[2].trim(),
      });
    }
    return t('admin.siblings.summaryTechnical', {
      count: Number(match[1]),
      names: rest,
    });
  }

  if (/\bsiblings\b/i.test(text)) {
    return text.replace(/\bsiblings\b/gi, t('admin.siblings.summaryWord'));
  }

  return text;
}

export function formatSiblingAgeAtAdmission(
  age: number | null | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
): string | null {
  if (age == null || !Number.isFinite(age)) return null;
  if (age === 0) return t('admin.siblings.lessThanOneYear');
  return t('admin.siblings.ageYears', { age });
}

export function siblingLineDisplayName(line: SiblingLine): string {
  return cleanDisplayValue(line.name) || '';
}

export function shouldShowSiblingLegacyFields(
  detail: SiblingsFieldsSource,
  lines: SiblingLine[],
): boolean {
  if (lines.length > 0) {
    const summary = cleanDisplayValue(detail.siblings_summary);
    const raw = cleanDisplayValue(detail.siblings_raw_text);
    const levels = cleanDisplayValue(detail.siblings_levels);
    if (summary && !isTechnicalSiblingSummary(summary)) return true;
    if (raw) return true;
    if (levels) return true;
    return false;
  }
  return Boolean(
    hasMeaningfulSiblingLegacyText(detail.siblings_summary) ||
      hasMeaningfulSiblingLegacyText(detail.siblings_raw_text) ||
      hasMeaningfulSiblingLegacyText(detail.siblings_levels),
  );
}

/** @deprecated use localizeSiblingSummary */
export function humanizeSiblingSummary(
  summary: string | null | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
): string | null {
  return localizeSiblingSummary(summary, t);
}
