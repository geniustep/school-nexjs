import type {
  AcademicClassContextOption,
  AcademicContextAppliedFilters,
  AcademicContextOptionsResponse,
  AcademicContextReadiness,
  AcademicContextReadinessIssue,
  AcademicContextWarning,
  AcademicTermOption,
  AcademicTermsListResponse,
  AcademicYearOption,
  CycleOption,
  EffectiveSubjectOption,
  EffectiveSubjectSource,
  InvalidatedAcademicSelection,
  LevelContextOption,
  SelectedAcademicContext,
  TeachingLanguageOption,
  TeachingOfferingContextOption,
  TeachingReferenceContextOption,
  TrackContextOption,
  AcademicContextOptionRef,
} from '@/types/academic-context';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  return undefined;
}

function normalizeRef(raw: unknown): AcademicContextOptionRef | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name =
    asString(record.name)?.trim() ||
    asString(record.display_name)?.trim() ||
    asString(record.display_label)?.trim();
  if (!name) return null;
  return {
    id: Number(record.id),
    name,
    code: asString(record.code) ?? null,
    display_name: asString(record.display_name) ?? null,
    display_alias: asString(record.display_alias) ?? null,
  };
}

function normalizeAllowedActions(raw: unknown): Record<string, boolean> | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const map: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'boolean') map[key] = value;
  }
  return map;
}

function normalizeIssue(raw: unknown): AcademicContextReadinessIssue | null {
  const record = asRecord(raw);
  if (!record) return null;
  const code = asString(record.code)?.trim();
  if (!code) return null;
  return {
    code,
    severity: asString(record.severity) ?? undefined,
    message: asString(record.message) ?? null,
    field: asString(record.field) ?? null,
  };
}

function normalizeReadiness(raw: unknown): AcademicContextReadiness | null {
  const record = asRecord(raw);
  if (!record) return null;
  const blockers = Array.isArray(record.blockers)
    ? record.blockers.map(normalizeIssue).filter((x): x is AcademicContextReadinessIssue => !!x)
    : [];
  const warnings = Array.isArray(record.warnings)
    ? record.warnings.map(normalizeIssue).filter((x): x is AcademicContextReadinessIssue => !!x)
    : [];
  const issues = Array.isArray(record.issues)
    ? record.issues.map(normalizeIssue).filter((x): x is AcademicContextReadinessIssue => !!x)
    : [];
  return {
    ready: asBoolean(record.ready),
    blockers,
    warnings,
    issues,
  };
}

function normalizeWarning(raw: unknown): AcademicContextWarning | null {
  const record = asRecord(raw);
  if (!record) return null;
  const code = asString(record.code)?.trim();
  if (!code) return null;
  return {
    code,
    message: asString(record.message) ?? null,
    severity: asString(record.severity) ?? null,
    field: asString(record.field) ?? null,
  };
}

function normalizeInvalidated(raw: unknown): InvalidatedAcademicSelection | null {
  const record = asRecord(raw);
  if (!record) return null;
  const field = asString(record.field)?.trim();
  if (!field) return null;
  return {
    field,
    previous_value:
      asNumber(record.previous_value) ?? asString(record.previous_value) ?? null,
    reason: asString(record.reason) ?? null,
  };
}

export function normalizeAcademicYearOption(raw: unknown): AcademicYearOption | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name = asString(record.name)?.trim() || asString(record.display_name)?.trim();
  if (!name) return null;
  return {
    id: Number(record.id),
    name,
    code: asString(record.code) ?? null,
    date_start: asString(record.date_start) ?? null,
    date_end: asString(record.date_end) ?? null,
    active: asBoolean(record.active),
    state: asString(record.state) ?? null,
  };
}

export function normalizeCycleOption(raw: unknown): CycleOption | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name = asString(record.name)?.trim();
  if (!name) return null;
  return {
    id: Number(record.id),
    name,
    code: asString(record.code) ?? null,
    sequence: asNumber(record.sequence) ?? null,
  };
}

export function normalizeLevelContextOption(raw: unknown): LevelContextOption | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name =
    asString(record.name)?.trim() ||
    asString(record.display_name)?.trim() ||
    asString(record.display_alias)?.trim();
  if (!name) return null;
  return {
    id: Number(record.id),
    name,
    code: asString(record.code) ?? null,
    display_name: asString(record.display_name) ?? null,
    display_alias: asString(record.display_alias) ?? null,
    academic_code: asString(record.academic_code) ?? null,
    cycle: normalizeRef(record.cycle),
    supports_tracks: asBoolean(record.supports_tracks),
    display_label: asString(record.display_label) ?? null,
  };
}

export function normalizeTrackContextOption(raw: unknown): TrackContextOption | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name = asString(record.name)?.trim();
  if (!name) return null;
  return {
    id: Number(record.id),
    name,
    code: asString(record.code) ?? null,
    level_id: asNumber(record.level_id) ?? null,
    display_label: asString(record.display_label) ?? null,
  };
}

/**
 * Language options must carry a human label. Raw ID-only payloads are rejected.
 * Returns null for incomplete rows; callers detect empty labeled set via language_contract_complete.
 */
export function normalizeTeachingLanguageOption(raw: unknown): TeachingLanguageOption | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name =
    asString(record.name)?.trim() ||
    asString(record.display_label)?.trim() ||
    asString(record.display_name)?.trim();
  const code = asString(record.code)?.trim() || asString(record.locale)?.trim() || null;
  if (!name) return null;
  return {
    id: Number(record.id),
    name,
    code,
    locale: asString(record.locale) ?? null,
    display_label: asString(record.display_label) ?? name,
  };
}

export function normalizeEffectiveSubjectOption(raw: unknown): EffectiveSubjectOption | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name = asString(record.name)?.trim();
  if (!name) return null;
  const sourceRaw = asString(record.source);
  const source: EffectiveSubjectSource | null =
    sourceRaw === 'level' ||
    sourceRaw === 'track' ||
    sourceRaw === 'class' ||
    sourceRaw === 'offering'
      ? sourceRaw
      : null;
  return {
    id: Number(record.id),
    name,
    code: asString(record.code) ?? null,
    source,
    level: normalizeRef(record.level),
    track: normalizeRef(record.track),
    offering_count: asNumber(record.offering_count) ?? null,
    ambiguous: asBoolean(record.ambiguous),
    display_label: asString(record.display_label) ?? null,
    context_label: asString(record.context_label) ?? null,
  };
}

export function normalizeOfferingContextOption(
  raw: unknown,
): TeachingOfferingContextOption | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name =
    asString(record.name)?.trim() ||
    asString(record.display_label)?.trim() ||
    asString(record.display_name)?.trim();
  if (!name) return null;
  return {
    id: Number(record.id),
    name,
    state: asString(record.state) ?? null,
    academic_year: normalizeRef(record.academic_year),
    cycle: normalizeRef(record.cycle),
    level: normalizeRef(record.level),
    subject: normalizeRef(record.subject),
    track: normalizeRef(record.track),
    teaching_language: normalizeTeachingLanguageOption(record.teaching_language),
    teaching_reference: normalizeRef(record.teaching_reference),
    display_label: asString(record.display_label) ?? null,
    context_fingerprint: asString(record.context_fingerprint) ?? null,
    allowed_actions: normalizeAllowedActions(record.allowed_actions),
  };
}

export function normalizeReferenceContextOption(
  raw: unknown,
): TeachingReferenceContextOption | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name =
    asString(record.name)?.trim() || asString(record.display_label)?.trim();
  if (!name) return null;
  return {
    id: Number(record.id),
    name,
    version_label: asString(record.version_label) ?? null,
    subject: normalizeRef(record.subject),
    level: normalizeRef(record.level),
    track: normalizeRef(record.track),
    teaching_language: normalizeTeachingLanguageOption(record.teaching_language),
    academic_year: normalizeRef(record.academic_year),
    offering_id: asNumber(record.offering_id) ?? asNumber(record.teaching_offering_id) ?? null,
    display_label: asString(record.display_label) ?? null,
    context_complete: asBoolean(record.context_complete),
  };
}

export function normalizeAcademicTermOption(raw: unknown): AcademicTermOption | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name = asString(record.name)?.trim();
  if (!name) return null;
  const year = normalizeRef(record.academic_year) ?? normalizeAcademicYearOption(record.academic_year);
  return {
    id: Number(record.id),
    name,
    code: asString(record.code) ?? null,
    sequence: asNumber(record.sequence) ?? null,
    date_start: asString(record.date_start) ?? null,
    date_end: asString(record.date_end) ?? null,
    state: asString(record.state) ?? null,
    active: asBoolean(record.active),
    academic_year: year
      ? { id: year.id, name: year.name, code: year.code ?? null }
      : null,
    academic_year_id: asNumber(record.academic_year_id) ?? year?.id ?? null,
    allowed_actions: normalizeAllowedActions(record.allowed_actions),
    display_label: asString(record.display_label) ?? null,
  };
}

export function normalizeClassContextOption(raw: unknown): AcademicClassContextOption | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name = asString(record.name)?.trim();
  if (!name) return null;
  return {
    id: Number(record.id),
    name,
    code: asString(record.code) ?? null,
    display_name: asString(record.display_name) ?? null,
    display_alias: asString(record.display_alias) ?? null,
    section_name: asString(record.section_name) ?? null,
    academic_code: asString(record.academic_code) ?? null,
    recommended_display_code: asString(record.recommended_display_code) ?? null,
    code_status: asString(record.code_status) ?? null,
    level: normalizeRef(record.level),
    track: normalizeRef(record.track),
    academic_year: normalizeRef(record.academic_year),
    display_label: asString(record.display_label) ?? null,
  };
}

function normalizeSelectedContext(raw: unknown): SelectedAcademicContext | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    academic_year_id: asNumber(record.academic_year_id) ?? null,
    cycle_id: asNumber(record.cycle_id) ?? null,
    level_id: asNumber(record.level_id) ?? null,
    track_id: asNumber(record.track_id) ?? null,
    teaching_language_id: asNumber(record.teaching_language_id) ?? null,
    subject_id: asNumber(record.subject_id) ?? null,
    offering_id:
      asNumber(record.offering_id) ?? asNumber(record.teaching_offering_id) ?? null,
    teaching_offering_id:
      asNumber(record.teaching_offering_id) ?? asNumber(record.offering_id) ?? null,
    reference_id: asNumber(record.reference_id) ?? null,
    term_id: asNumber(record.term_id) ?? null,
    class_id: asNumber(record.class_id) ?? null,
    scope: asString(record.scope) ?? null,
  };
}

function normalizeAppliedFilters(raw: unknown): AcademicContextAppliedFilters | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    academic_year_id: asNumber(record.academic_year_id) ?? null,
    cycle_id: asNumber(record.cycle_id) ?? null,
    level_id: asNumber(record.level_id) ?? null,
    track_id: asNumber(record.track_id) ?? null,
    teaching_language_id: asNumber(record.teaching_language_id) ?? null,
    subject_id: asNumber(record.subject_id) ?? null,
    offering_id:
      asNumber(record.offering_id) ?? asNumber(record.teaching_offering_id) ?? null,
    teaching_offering_id:
      asNumber(record.teaching_offering_id) ?? asNumber(record.offering_id) ?? null,
    reference_id: asNumber(record.reference_id) ?? null,
    term_id: asNumber(record.term_id) ?? null,
    class_id: asNumber(record.class_id) ?? null,
    scope: asString(record.scope) ?? null,
    include_inactive: asBoolean(record.include_inactive),
  };
}

function listFrom(data: Record<string, unknown>, ...keys: string[]): unknown[] {
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

/**
 * Detects raw language ID rows without labels (contract incomplete).
 */
export function detectRawLanguageIdsWithoutLabels(rawLanguages: unknown): boolean {
  if (!Array.isArray(rawLanguages) || rawLanguages.length === 0) return false;
  return rawLanguages.some((item) => {
    if (typeof item === 'number') return true;
    const record = asRecord(item);
    if (!record || asNumber(record.id) == null) return false;
    const name =
      asString(record.name)?.trim() ||
      asString(record.display_label)?.trim() ||
      asString(record.display_name)?.trim();
    return !name;
  });
}

export function normalizeAcademicContextOptions(
  raw: unknown,
): AcademicContextOptionsResponse {
  const root = asRecord(raw) ?? {};
  const data = asRecord(root.data) ?? root;

  const rawLanguages = listFrom(data, 'teaching_languages', 'languages');
  const languageContractIncomplete = detectRawLanguageIdsWithoutLabels(rawLanguages);
  const languages = languageContractIncomplete
    ? []
    : rawLanguages
        .map(normalizeTeachingLanguageOption)
        .filter((x): x is TeachingLanguageOption => !!x);

  return {
    selected_context: normalizeSelectedContext(data.selected_context),
    academic_years: listFrom(data, 'academic_years', 'years')
      .map(normalizeAcademicYearOption)
      .filter((x): x is AcademicYearOption => !!x),
    cycles: listFrom(data, 'cycles')
      .map(normalizeCycleOption)
      .filter((x): x is CycleOption => !!x),
    levels: listFrom(data, 'levels')
      .map(normalizeLevelContextOption)
      .filter((x): x is LevelContextOption => !!x),
    tracks: listFrom(data, 'tracks')
      .map(normalizeTrackContextOption)
      .filter((x): x is TrackContextOption => !!x),
    teaching_languages: languages,
    subjects: listFrom(data, 'subjects', 'effective_subjects')
      .map(normalizeEffectiveSubjectOption)
      .filter((x): x is EffectiveSubjectOption => !!x),
    offerings: listFrom(data, 'offerings', 'teaching_offerings')
      .map(normalizeOfferingContextOption)
      .filter((x): x is TeachingOfferingContextOption => !!x),
    references: listFrom(data, 'references', 'teaching_references')
      .map(normalizeReferenceContextOption)
      .filter((x): x is TeachingReferenceContextOption => !!x),
    terms: listFrom(data, 'terms')
      .map(normalizeAcademicTermOption)
      .filter((x): x is AcademicTermOption => !!x),
    classes: listFrom(data, 'classes')
      .map(normalizeClassContextOption)
      .filter((x): x is AcademicClassContextOption => !!x),
    applied_filters: normalizeAppliedFilters(data.applied_filters),
    invalidated_selections: Array.isArray(data.invalidated_selections)
      ? data.invalidated_selections
          .map(normalizeInvalidated)
          .filter((x): x is InvalidatedAcademicSelection => !!x)
      : [],
    readiness: normalizeReadiness(data.readiness),
    warnings: Array.isArray(data.warnings)
      ? data.warnings.map(normalizeWarning).filter((x): x is AcademicContextWarning => !!x)
      : [],
    language_contract_complete: !languageContractIncomplete,
  };
}

export function normalizeAcademicTermsList(raw: unknown): AcademicTermsListResponse {
  const root = asRecord(raw) ?? {};
  const data = asRecord(root.data) ?? root;
  const termsSource = Array.isArray(data.terms)
    ? data.terms
    : Array.isArray(raw)
      ? (raw as unknown[])
      : [];
  return {
    academic_year: normalizeAcademicYearOption(data.academic_year),
    terms: termsSource
      .map(normalizeAcademicTermOption)
      .filter((x): x is AcademicTermOption => !!x),
    readiness: normalizeReadiness(data.readiness),
    warnings: Array.isArray(data.warnings)
      ? data.warnings.map(normalizeWarning).filter((x): x is AcademicContextWarning => !!x)
      : [],
    allowed_actions: normalizeAllowedActions(data.allowed_actions),
  };
}

export const ACADEMIC_CONTEXT_ERROR_CODES = [
  'academic_context_school_mismatch',
  'academic_context_year_mismatch',
  'academic_context_cycle_level_mismatch',
  'academic_context_level_track_mismatch',
  'academic_context_subject_not_available',
  'academic_context_offering_required',
  'academic_context_offering_ambiguous',
  'academic_context_offering_mismatch',
  'academic_context_reference_mismatch',
  'academic_year_not_found',
  'academic_year_school_mismatch',
  'term_dates_invalid',
  'term_dates_outside_academic_year',
  'term_dates_overlap',
  'terms_partially_initialized',
  'terms_configuration_conflict',
  'assignment_teaching_offering_mismatch',
  'timetable_teaching_offering_mismatch',
  'exam_term_year_mismatch',
  'exam_teaching_offering_mismatch',
  'gradebook_term_year_mismatch',
  'gradebook_teaching_offering_mismatch',
  'teaching_reference_context_incomplete',
  'academic_language_options_incomplete',
] as const;

export type AcademicContextErrorCode = (typeof ACADEMIC_CONTEXT_ERROR_CODES)[number];

export function academicContextErrorMessageKey(code: string): string {
  return `academicContext.errors.${code}`;
}
