import type { TeachingAssignment } from '@/types/academic-setup';
import type {
  AnnualDistributionLinePayload,
  AnnualDistributionSummary,
  DidacticSequenceSessionTemplate,
  DidacticSequenceSummary,
  DistributionBatchApplyMode,
  TeachingOfferingDetail,
  TeachingOfferingSummary,
  TeachingReferenceSummary,
} from '@/types/teaching-planning';

export const TEACHING_PLANNING_PAGE_SIZE = 20;

export const TEACHING_PLANNING_STATE_OPTIONS = [
  'draft',
  'under_review',
  'approved',
  'archived',
] as const;

/**
 * Annual Distribution adds an `active` state beyond the reference/offering
 * lifecycle. An active distribution is what satisfies the offering's
 * `distribution_ready` readiness — it is NOT a timetable requirement.
 */
export const DISTRIBUTION_STATE_OPTIONS = [
  'draft',
  'under_review',
  'approved',
  'active',
  'archived',
] as const;

/** Session template types (a template ≠ an actual/scheduled session). */
export const SESSION_TYPE_OPTIONS = [
  'construction',
  'practice',
  'consolidation',
  'assessment',
  'support',
  'support_impact_assessment',
  'focused_remediation',
  'enrichment',
  'synthesis',
  'project',
  'experiment',
  'review',
  'other',
] as const;

/** Distribution line item types. */
export const DISTRIBUTION_ITEM_TYPE_OPTIONS = [
  'sequence',
  'assessment',
  'support',
  'synthesis',
  'project',
  'review',
  'other',
] as const;

export const DISTRIBUTION_BATCH_MODES: readonly DistributionBatchApplyMode[] = [
  'append',
  'replace',
  'upsert',
] as const;

export type TeachingPlanningListEmptyVariant = 'noData' | 'noMatch';

export function teachingPlanningListHasActiveQuery(filters: {
  search?: string;
  state?: string;
  levelId?: string;
  subjectId?: string;
  yearId?: string;
  languageId?: string;
}): boolean {
  return Boolean(
    filters.search?.trim() ||
      filters.state ||
      filters.levelId ||
      filters.subjectId ||
      filters.yearId ||
      filters.languageId,
  );
}

export function resolveTeachingPlanningListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): TeachingPlanningListEmptyVariant {
  return options.hasActiveQuery ? 'noMatch' : 'noData';
}

export function filterTeachingReferencesClient(
  rows: TeachingReferenceSummary[],
  search: string,
): TeachingReferenceSummary[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const haystack = [
      row.name,
      row.publisher,
      row.isbn,
      row.subject.name,
      row.level.name,
      row.teaching_language?.name,
      row.teaching_language?.code,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function filterTeachingOfferingsClient(
  rows: TeachingOfferingSummary[],
  search: string,
): TeachingOfferingSummary[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const haystack = [
      row.display_name,
      row.subject.name,
      row.level.name,
      row.academic_year.name,
      row.teaching_language?.name,
      row.reference?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function teachingPlanningBlockerLabelKey(code: string): string {
  return `admin.teachingPlanning.blockers.${code}`;
}

export function teachingOfferingReadinessTone(
  ready: boolean,
): 'green' | 'amber' | 'slate' {
  return ready ? 'green' : 'amber';
}

export function offeringShowsAnnualDistributionRequired(
  offering: Pick<TeachingOfferingSummary, 'readiness' | 'activation_blockers'>,
): boolean {
  return (
    !offering.readiness.distribution_ready ||
    offering.readiness.blockers.includes('annual_distribution_required') ||
    offering.activation_blockers.includes('annual_distribution_required')
  );
}

export function offeringIsApprovedButNotActivationReady(
  offering: Pick<TeachingOfferingSummary, 'state' | 'readiness'>,
): boolean {
  return offering.state === 'approved' && offering.readiness.ready_for_activation === false;
}

/** Candidate assignments for optional offering link — never creates a parallel assignment. */
export function filterAssignmentCandidatesForOffering(
  assignments: TeachingAssignment[],
  offering: Pick<
    TeachingOfferingDetail,
    'id' | 'school' | 'subject' | 'level' | 'assignments'
  >,
): TeachingAssignment[] {
  const linkedIds = new Set(offering.assignments.map((row) => row.id));
  return assignments.filter((row) => {
    if (linkedIds.has(row.id)) return false;
    if (row.teaching_offering_id != null && row.teaching_offering_id !== offering.id) {
      return false;
    }
    if (row.school?.id != null && row.school.id !== offering.school.id) return false;
    if (row.subject?.id != null && row.subject.id !== offering.subject.id) return false;
    if (row.class?.level_id != null && row.class.level_id !== offering.level.id) {
      return false;
    }
    return true;
  });
}

/* --------------------------------------------------------------------------
 * Hub cards
 *
 * Semantic guardrails encoded in this module:
 * - Annual Distribution ≠ timetable requirement. It is the year-long ordered
 *   plan of instructional items for one offering; approving/activating it is
 *   what satisfies distribution readiness. It never creates timetable slots.
 * - Didactic Sequence ≠ Jathatha. A sequence is the lesson/unit plan of session
 *   TEMPLATES; a Jathatha is a daily lesson-preparation sheet (still coming).
 * - Instructional Item ≠ Calendar Marker. Timeline never merges the two kinds.
 * - Readiness is always taken from Backend; this module never invents it.
 * ------------------------------------------------------------------------ */

/**
 * Live routes now include distributions, sequences, jathatha surfaces, and
 * the Actual Delivery review / Class Journal / Teaching Progress surfaces.
 * Actual Delivery Review, Class Journal, and Teaching Progress ARE implemented.
 */
export const TEACHING_PLANNING_IMPLEMENTED_HREFS = [
  '/admin/teaching-planning',
  '/admin/teaching-planning/references',
  '/admin/teaching-planning/offerings',
  '/admin/teaching-planning/sequences',
  '/admin/teaching-planning/distributions',
  '/admin/teaching-planning/reference-jathathas',
  '/admin/teaching-planning/teacher-jathathas',
  '/admin/teaching-planning/actual-deliveries',
  '/admin/teaching-planning/class-journal',
  '/admin/teaching-planning/progress',
] as const;

export type TeachingPlanningHubCapability =
  | 'offerings'
  | 'distributions'
  | 'sequences'
  | 'references'
  | 'referenceJathathas'
  | 'teacherJathathaReview'
  | 'actualDeliveries'
  | 'classJournal'
  | 'progress';

/** Visual workflow groups on the teaching-planning hub. */
export type TeachingPlanningHubSection = 'plan' | 'jathatha' | 'delivery';

export const TEACHING_PLANNING_HUB_SECTIONS = [
  {
    id: 'plan' as const,
    titleKey: 'admin.teachingPlanning.hub.sections.planTitle',
    descKey: 'admin.teachingPlanning.hub.sections.planDesc',
  },
  {
    id: 'jathatha' as const,
    titleKey: 'admin.teachingPlanning.hub.sections.jathathaTitle',
    descKey: 'admin.teachingPlanning.hub.sections.jathathaDesc',
  },
  {
    id: 'delivery' as const,
    titleKey: 'admin.teachingPlanning.hub.sections.deliveryTitle',
    descKey: 'admin.teachingPlanning.hub.sections.deliveryDesc',
  },
] as const;

export const TEACHING_PLANNING_HUB_CARDS = [
  {
    href: '/admin/teaching-planning/offerings',
    icon: '🧭',
    titleKey: 'admin.teachingPlanning.hub.offeringsTitle',
    descKey: 'admin.teachingPlanning.hub.offeringsDesc',
    capability: 'offerings' as const,
    section: 'plan' as const,
    featured: true,
  },
  {
    href: '/admin/teaching-planning/distributions',
    icon: '🗓️',
    titleKey: 'admin.teachingPlanning.hub.distributionTitle',
    descKey: 'admin.teachingPlanning.hub.distributionDesc',
    capability: 'distributions' as const,
    section: 'plan' as const,
    featured: true,
  },
  {
    href: '/admin/teaching-planning/sequences',
    icon: '🧩',
    titleKey: 'admin.teachingPlanning.hub.sequencesTitle',
    descKey: 'admin.teachingPlanning.hub.sequencesDesc',
    capability: 'sequences' as const,
    section: 'plan' as const,
    featured: false,
  },
  {
    href: '/admin/teaching-planning/references',
    icon: '📚',
    titleKey: 'admin.teachingPlanning.hub.referencesTitle',
    descKey: 'admin.teachingPlanning.hub.referencesDesc',
    capability: 'references' as const,
    section: 'plan' as const,
    featured: false,
  },
  {
    href: '/admin/teaching-planning/reference-jathathas',
    icon: '📝',
    titleKey: 'admin.teachingPlanning.hub.referenceJathathaTitle',
    descKey: 'admin.teachingPlanning.hub.referenceJathathaDesc',
    capability: 'referenceJathathas' as const,
    section: 'jathatha' as const,
    featured: false,
  },
  {
    href: '/admin/teaching-planning/teacher-jathathas',
    icon: '🔎',
    titleKey: 'admin.teachingPlanning.hub.teacherJathathaReviewTitle',
    descKey: 'admin.teachingPlanning.hub.teacherJathathaReviewDesc',
    capability: 'teacherJathathaReview' as const,
    section: 'jathatha' as const,
    featured: false,
  },
  {
    href: '/admin/teaching-planning/actual-deliveries',
    icon: '📋',
    titleKey: 'admin.teachingPlanning.hub.actualDeliveryTitle',
    descKey: 'admin.teachingPlanning.hub.actualDeliveryDesc',
    capability: 'actualDeliveries' as const,
    section: 'delivery' as const,
    featured: false,
  },
  {
    href: '/admin/teaching-planning/class-journal',
    icon: '📔',
    titleKey: 'admin.teachingPlanning.hub.classJournalTitle',
    descKey: 'admin.teachingPlanning.hub.classJournalDesc',
    capability: 'classJournal' as const,
    section: 'delivery' as const,
    featured: false,
  },
  {
    href: '/admin/teaching-planning/progress',
    icon: '📈',
    // Reuses the pre-existing "coming soon" hub keys; their copy now
    // describes a live surface and will be updated via translations.
    titleKey: 'admin.teachingPlanning.hub.progressTitle',
    descKey: 'admin.teachingPlanning.hub.progressDesc',
    capability: 'progress' as const,
    section: 'delivery' as const,
    featured: false,
  },
] as const;

/**
 * Actual Delivery Review, Class Journal, and Teaching Progress ARE implemented
 * (see TEACHING_PLANNING_HUB_CARDS above). Nothing remains coming-soon today;
 * keep this array ready for future surfaces without needing to touch the hub.
 */
export const TEACHING_PLANNING_COMING_SOON_CARDS: ReadonlyArray<{
  titleKey: string;
  descKey: string;
}> = [];

/** Coming-soon cards must never expose live routes. */
export function teachingPlanningComingSoonHasLiveRoute(): boolean {
  return TEACHING_PLANNING_COMING_SOON_CARDS.some(
    (card) => 'href' in card && Boolean((card as { href?: string }).href),
  );
}

/* ------------------------------ Filter helpers --------------------------- */

export function filterDidacticSequencesClient(
  rows: DidacticSequenceSummary[],
  search: string,
): DidacticSequenceSummary[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const haystack = [
      row.name,
      row.unit,
      row.lesson,
      row.subject.name,
      row.level.name,
      row.reference?.name,
      row.teaching_language?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function filterAnnualDistributionsClient(
  rows: AnnualDistributionSummary[],
  search: string,
): AnnualDistributionSummary[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const haystack = [
      row.name,
      row.offering?.display_name,
      row.subject?.name,
      row.level?.name,
      row.academic_year?.name,
      row.period_label,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

/* ------------------------------ Session totals --------------------------- */

/** Expected total real sessions covered by a set of session templates. */
export function sumExpectedSessionCount(
  templates: Array<Pick<DidacticSequenceSessionTemplate, 'expected_session_count' | 'active'>>,
): number {
  return templates.reduce(
    (total, tpl) => total + (tpl.active === false ? 0 : Math.max(0, tpl.expected_session_count || 0)),
    0,
  );
}

/* ------------------------------ Reorder helpers -------------------------- */

/** Renumber `order` sequentially starting at 1 (keyboard-accessible reorder). */
export function renumberOrder<T extends { order: number }>(rows: T[]): T[] {
  return rows.map((row, index) => ({ ...row, order: index + 1 }));
}

/** Move the row at `index` one step earlier, then renumber. */
export function moveUp<T extends { order: number }>(rows: T[], index: number): T[] {
  if (index <= 0 || index >= rows.length) return rows;
  const next = [...rows];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return renumberOrder(next);
}

/** Move the row at `index` one step later, then renumber. */
export function moveDown<T extends { order: number }>(rows: T[], index: number): T[] {
  if (index < 0 || index >= rows.length - 1) return rows;
  const next = [...rows];
  [next[index + 1], next[index]] = [next[index], next[index + 1]];
  return renumberOrder(next);
}

/* --------------------------- Batch paste parser -------------------------- */

/**
 * Parse a spreadsheet/TSV paste into distribution line rows. Client-side
 * pre-fill only — Backend validate-batch is always the authority. Columns:
 * item_type, name, period_label, date_start, date_end, session_count,
 * external_reference, notes. A leading header row is auto-detected and skipped.
 */
export function parseDistributionBatchPaste(text: string): AnnualDistributionLinePayload[] {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const knownTypes = new Set<string>(DISTRIBUTION_ITEM_TYPE_OPTIONS);
  const splitRow = (line: string): string[] =>
    (line.includes('\t') ? line.split('\t') : line.split(/ {2,}|;|,/)).map((cell) =>
      cell.trim(),
    );

  const firstCells = splitRow(lines[0]).map((c) => c.toLowerCase());
  const looksLikeHeader =
    firstCells.includes('item_type') ||
    firstCells.includes('name') ||
    firstCells.includes('type');
  const bodyLines = looksLikeHeader ? lines.slice(1) : lines;

  const toNumber = (value: string | undefined): number | null => {
    if (!value) return null;
    const n = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  };
  const clean = (value: string | undefined): string | null => {
    const v = value?.trim();
    return v ? v : null;
  };

  return bodyLines.map((line, index) => {
    const cells = splitRow(line);
    const rawType = (cells[0] ?? '').toLowerCase();
    const item_type = knownTypes.has(rawType) ? rawType : rawType ? 'other' : 'sequence';
    return {
      order: index + 1,
      item_type,
      name: clean(cells[1]),
      period_label: clean(cells[2]),
      date_start: clean(cells[3]),
      date_end: clean(cells[4]),
      session_count: toNumber(cells[5]),
      external_reference: clean(cells[6]),
      notes: clean(cells[7]),
    };
  });
}

/** Convert editor line rows into the payload rows the batch endpoints expect. */
export function distributionLinesToPayload(
  rows: Array<{
    id?: number;
    order: number;
    item_type: string;
    sequence?: { id: number } | null;
    name?: string | null;
    period_label?: string | null;
    date_start?: string | null;
    date_end?: string | null;
    session_count?: number | null;
    external_reference?: string | null;
    notes?: string | null;
  }>,
): AnnualDistributionLinePayload[] {
  return rows.map((row, index) => ({
    id: row.id,
    order: row.order ?? index + 1,
    item_type: row.item_type,
    sequence_id: row.sequence?.id ?? null,
    name: row.name ?? null,
    period_label: row.period_label ?? null,
    date_start: row.date_start ?? null,
    date_end: row.date_end ?? null,
    session_count: row.session_count ?? null,
    external_reference: row.external_reference ?? null,
    notes: row.notes ?? null,
  }));
}

/** i18n key for a session template type label. */
export function sessionTypeLabelKey(type: string): string {
  return `admin.teachingPlanning.sessionTypes.${type}`;
}

/** i18n key for a distribution line item type label. */
export function distributionItemTypeLabelKey(type: string): string {
  return `admin.teachingPlanning.itemTypes.${type}`;
}
