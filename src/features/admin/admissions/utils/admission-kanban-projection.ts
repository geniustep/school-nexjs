/**
 * Kanban list query helpers.
 *
 * Live Backend `projection=kanban` omits `last_action.note`, which cards need for
 * «آخر سبب للحالة». Board fetches therefore use the full list payload.
 * Table/Detail/Dashboard must never send `projection=kanban`.
 */

export const ADMISSIONS_KANBAN_PROJECTION = 'kanban' as const;

/** @deprecated Kept for identity tests; board fetches no longer attach this. */
export const ADMISSIONS_KANBAN_PROJECTION_QUERY = {
  projection: ADMISSIONS_KANBAN_PROJECTION,
} as const;

/**
 * @deprecated Prefer `withKanbanBoardListQuery` — kanban projection drops status notes.
 * Merge `projection=kanban` into a list query without mutating the input.
 */
export function withKanbanListProjection<T extends Record<string, unknown>>(
  query: T,
): T & { projection: typeof ADMISSIONS_KANBAN_PROJECTION } {
  return {
    ...query,
    projection: ADMISSIONS_KANBAN_PROJECTION,
  };
}

/**
 * Kanban board/column list query — full admission rows so `last_action.note`
 * and terminal reasons remain available on cards.
 */
export function withKanbanBoardListQuery<T extends Record<string, unknown>>(query: T): T {
  const { projection: _ignored, ...rest } = query as T & { projection?: unknown };
  void _ignored;
  return rest as T;
}

export function isKanbanListProjection(query: Record<string, unknown> | null | undefined): boolean {
  return query?.projection === ADMISSIONS_KANBAN_PROJECTION;
}
