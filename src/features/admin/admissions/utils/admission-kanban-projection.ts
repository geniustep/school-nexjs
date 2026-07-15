/**
 * Kanban list projection contract (Odoo `projection=kanban`).
 * Only Kanban column/board fetches may attach this — never Table/Detail/Dashboard.
 */

export const ADMISSIONS_KANBAN_PROJECTION = 'kanban' as const;

/** Query identity fragment — must appear in Kanban request signatures. */
export const ADMISSIONS_KANBAN_PROJECTION_QUERY = {
  projection: ADMISSIONS_KANBAN_PROJECTION,
} as const;

/**
 * Merge `projection=kanban` into a list query without mutating the input.
 * Callers must not reuse the result for Table/Detail/Dashboard fetches.
 */
export function withKanbanListProjection<T extends Record<string, unknown>>(
  query: T,
): T & { projection: typeof ADMISSIONS_KANBAN_PROJECTION } {
  return {
    ...query,
    projection: ADMISSIONS_KANBAN_PROJECTION,
  };
}

export function isKanbanListProjection(query: Record<string, unknown> | null | undefined): boolean {
  return query?.projection === ADMISSIONS_KANBAN_PROJECTION;
}
