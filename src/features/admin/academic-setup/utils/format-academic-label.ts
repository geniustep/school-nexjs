import type { Locale } from '@/lib/i18n/config';
import type { Level, SchoolClass } from '@/types/class';

export type AcademicLabelParts = {
  primary: string;
  secondary: string | null;
};

export type AcademicLevelLabelSource = Pick<
  Level,
  'name' | 'code' | 'display_name' | 'moroccan_display_alias'
>;

export type AcademicClassLabelSource = Pick<
  SchoolClass,
  'name' | 'code' | 'display_name' | 'display_alias' | 'section_name' | 'level' | 'track'
>;

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function sectionSuffixFromCode(classCode: string, levelCode: string | null): string | null {
  if (!levelCode || !classCode.startsWith(levelCode) || classCode.length <= levelCode.length) {
    return null;
  }
  const suffix = classCode.slice(levelCode.length).trim();
  if (!suffix) return null;
  if (/^[A-Za-z]$/.test(suffix)) {
    return suffix.toUpperCase();
  }
  return suffix;
}

function sectionSuffixFromShortName(shortName: string, levelCode: string | null): string | null {
  if (!shortName) return null;
  if (levelCode && shortName.startsWith(levelCode) && shortName.length > levelCode.length) {
    const suffix = shortName.slice(levelCode.length);
    if (/^[A-Za-z]$/.test(suffix)) return suffix.toUpperCase();
  }
  const match = shortName.match(/^[A-Z]+\d*([A-Z])$/i);
  if (match) return match[1].toUpperCase();
  return null;
}

function resolveClassSectionLabel(
  cls: AcademicClassLabelSource,
  locale: Locale,
  levelCode: string | null,
): string | null {
  const sectionName = nonEmpty(cls.section_name ?? null);
  if (sectionName) return sectionName;

  const code = nonEmpty(cls.code ?? null);
  const name = nonEmpty(cls.name ?? null);

  const suffixFromCode = code && levelCode ? sectionSuffixFromCode(code, levelCode) : null;
  if (suffixFromCode) return formatSectionLabel(suffixFromCode, locale);

  if (code?.includes('-')) {
    const tail = code.split('-').pop() ?? '';
    const suffixFromTail = sectionSuffixFromShortName(tail, levelCode);
    if (suffixFromTail) return formatSectionLabel(suffixFromTail, locale);
  }

  const suffixFromName = name ? sectionSuffixFromShortName(name, levelCode) : null;
  if (suffixFromName) return formatSectionLabel(suffixFromName, locale);

  return null;
}

function resolveClassSecondaryLabel(
  primary: string,
  code: string | null,
  name: string | null,
): string | null {
  if (name && name !== primary && name.length <= 8) return name;
  if (code && code !== primary && code !== name) return code;
  if (name && name !== primary) return name;
  return null;
}

const LATIN_SECTION_TO_ARABIC: Record<string, string> = {
  A: 'أ',
  B: 'ب',
  C: 'ج',
  D: 'د',
  E: 'ه',
  F: 'و',
  G: 'ز',
  H: 'ح',
  I: 'ط',
  J: 'ي',
  K: 'ك',
  L: 'ل',
  M: 'م',
  N: 'ن',
  O: 'و',
  P: 'ب',
  Q: 'ق',
  R: 'ر',
  S: 'س',
  T: 'ت',
  U: 'ع',
  V: 'ف',
  W: 'و',
  X: 'كس',
  Y: 'ي',
  Z: 'ز',
};

function formatSectionLabel(section: string, locale: Locale): string {
  if (/^[A-Z]$/.test(section)) {
    if (locale === 'ar') {
      const arabicLetter = LATIN_SECTION_TO_ARABIC[section] ?? section;
      return `القسم ${arabicLetter}`;
    }
    if (locale === 'fr') return `Section ${section}`;
    if (locale === 'es') return `Sección ${section}`;
    return `Section ${section}`;
  }
  return section;
}

export function formatAcademicLevelLabel(
  level: AcademicLevelLabelSource | null | undefined,
  _locale?: Locale,
): AcademicLabelParts {
  if (!level) {
    return { primary: '—', secondary: null };
  }

  const code = nonEmpty(level.code ?? null);
  const name = nonEmpty(level.name ?? null);
  const alias = nonEmpty(level.moroccan_display_alias ?? null);
  const display = nonEmpty(level.display_name ?? null);

  const primary =
    alias ??
    (display && display !== code ? display : null) ??
    (name && name !== code ? name : null) ??
    code ??
    name ??
    '—';

  let secondary: string | null = null;
  if (code && code !== primary) secondary = code;
  else if (name && name !== primary) secondary = name;

  return { primary, secondary };
}

export function formatAcademicClassLabel(
  cls: AcademicClassLabelSource,
  locale: Locale = 'ar',
): AcademicLabelParts {
  const code = nonEmpty(cls.code ?? null);
  const name = nonEmpty(cls.name ?? null);
  const displayAlias = nonEmpty(cls.display_alias ?? null);
  const displayName = nonEmpty(cls.display_name ?? null);
  const levelParts = formatAcademicLevelLabel(cls.level ?? null, locale);
  const levelCode = nonEmpty(cls.level?.code ?? null);

  let primary: string;
  if (displayAlias) {
    primary = displayAlias;
  } else if (displayName && displayName !== code) {
    primary = displayName;
  } else {
    const section = resolveClassSectionLabel(cls, locale, levelCode);

    if (levelParts.primary !== '—' && section) {
      primary = `${levelParts.primary} — ${section}`;
    } else if (levelParts.primary !== '—' && (name || code) && levelParts.primary !== name && levelParts.primary !== code) {
      primary = levelParts.primary;
    } else if (name && name !== code) {
      primary = name;
    } else {
      primary = code ?? name ?? '—';
    }
  }

  let secondary = resolveClassSecondaryLabel(primary, code, name);
  if (secondary === primary) secondary = null;

  return { primary, secondary };
}

export function formatAcademicLabelLine(parts: AcademicLabelParts): string {
  if (parts.secondary) return `${parts.primary} (${parts.secondary})`;
  return parts.primary;
}

export function academicLabelSearchHaystack(
  parts: AcademicLabelParts,
  extras: Array<string | null | undefined> = [],
): string {
  return [parts.primary, parts.secondary, ...extras]
    .filter((value): value is string => !!value?.trim())
    .join(' ')
    .toLowerCase();
}
