import type {
  AcademicClassContextOption,
  AcademicTermOption,
  EffectiveSubjectOption,
  LevelContextOption,
  TeachingLanguageOption,
  TeachingOfferingContextOption,
  TeachingReferenceContextOption,
} from '@/types/academic-context';

/** Level display priority: display_alias → display_name → name → academic_code → code */
export function formatLevelContextLabel(level: LevelContextOption): {
  primary: string;
  secondary: string | null;
} {
  const primary =
    level.display_alias?.trim() ||
    level.display_name?.trim() ||
    level.display_label?.trim() ||
    level.name.trim() ||
    level.academic_code?.trim() ||
    level.code?.trim() ||
    '';
  const academic = level.academic_code?.trim() || null;
  const code = level.code?.trim() || null;
  let secondary: string | null = null;
  if (academic && academic !== primary) secondary = academic;
  else if (code && code !== primary && code !== academic) secondary = code;
  return { primary, secondary };
}

/**
 * Class display: recommended_display_code when suitable, with section_name + level alias.
 * Never renames stored name/code.
 */
export function formatClassContextLabel(cls: AcademicClassContextOption): {
  primary: string;
  secondary: string | null;
} {
  const levelAlias =
    cls.level?.display_alias?.trim() ||
    cls.level?.display_name?.trim() ||
    cls.level?.name?.trim() ||
    null;
  const section = cls.section_name?.trim() || null;
  const recommended = cls.recommended_display_code?.trim() || null;
  const alias = cls.display_alias?.trim() || null;

  let primary =
    recommended ||
    alias ||
    cls.display_name?.trim() ||
    cls.name.trim();

  if (section && levelAlias && !recommended) {
    primary = `${levelAlias} · ${section}`;
  } else if (recommended && section && !recommended.includes(section)) {
    primary = `${recommended} · ${section}`;
  }

  const secondaryParts = [
    cls.name !== primary ? cls.name : null,
    cls.code && cls.code !== primary ? cls.code : null,
  ].filter(Boolean);
  return { primary, secondary: secondaryParts[0] ?? null };
}

export function formatEffectiveSubjectLabel(subject: EffectiveSubjectOption): {
  primary: string;
  secondary: string | null;
} {
  if (subject.display_label?.trim()) {
    return { primary: subject.name, secondary: subject.display_label.trim() };
  }
  const parts: string[] = [];
  if (subject.level?.display_alias || subject.level?.name) {
    parts.push(subject.level.display_alias?.trim() || subject.level.name);
  }
  if (subject.track?.name) parts.push(subject.track.name);
  if (subject.source === 'level') parts.push('level');
  else if (subject.source === 'track') parts.push('track');
  else if (subject.source === 'class') parts.push('class');
  else if (subject.source === 'offering') parts.push('offering');
  if (subject.offering_count != null && subject.offering_count > 1) {
    parts.push(String(subject.offering_count));
  }
  if (subject.context_label?.trim()) {
    return { primary: subject.name, secondary: subject.context_label.trim() };
  }
  return {
    primary: subject.name,
    secondary: parts.length ? parts.join(' · ') : subject.code?.trim() || null,
  };
}

export function formatOfferingContextLabel(
  offering: TeachingOfferingContextOption,
): string {
  if (offering.display_label?.trim()) return offering.display_label.trim();
  const parts = [
    offering.subject?.name,
    offering.level?.display_alias || offering.level?.name,
    offering.track?.name,
    offering.teaching_language?.name,
    offering.teaching_reference?.name,
    offering.academic_year?.name,
  ].filter((p): p is string => !!p?.trim());
  return parts.length ? parts.join(' · ') : offering.name;
}

export function formatReferenceContextLabel(
  reference: TeachingReferenceContextOption,
): {
  primary: string;
  secondary: string | null;
  incomplete: boolean;
} {
  const primary = reference.display_label?.trim() || reference.name;
  const parts = [
    reference.level?.display_alias || reference.level?.name,
    reference.track?.name,
    reference.teaching_language?.name,
    reference.version_label,
    reference.academic_year?.name,
  ].filter((p): p is string => !!p?.trim());
  return {
    primary,
    secondary: parts.length ? parts.join(' · ') : null,
    incomplete: reference.context_complete === false,
  };
}

export function formatTermOptionLabel(term: AcademicTermOption): string {
  if (term.display_label?.trim()) return term.display_label.trim();
  const range =
    term.date_start && term.date_end
      ? `${term.date_start} → ${term.date_end}`
      : term.date_start || term.date_end || null;
  const code = term.code?.trim();
  if (code && range) return `${term.name} (${code}) · ${range}`;
  if (code) return `${term.name} (${code})`;
  if (range) return `${term.name} · ${range}`;
  return term.name;
}

export function formatLanguageOptionLabel(lang: TeachingLanguageOption): string {
  if (lang.display_label?.trim()) return lang.display_label.trim();
  if (lang.code?.trim() && lang.code !== lang.name) {
    return `${lang.name} (${lang.code})`;
  }
  return lang.name;
}

/** Search haystack for class/level codes — no hardcoded Moroccan list. */
export function classContextSearchHaystack(cls: AcademicClassContextOption): string {
  return [
    cls.name,
    cls.code,
    cls.display_alias,
    cls.display_name,
    cls.academic_code,
    cls.recommended_display_code,
    cls.section_name,
    cls.level?.name,
    cls.level?.display_alias,
    cls.level?.code,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
