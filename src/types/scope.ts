// Admin scope model — mirrors API_REPORT.md §4.
// Returned inside /api/v1/me for admin users only.

export type ScopeType =
  | 'school' // full school — no restriction
  | 'level_group'
  | 'levels'
  | 'classes'
  | 'channels'
  | 'custom';

export interface AdminScope {
  type: ScopeType;
  // Human label for a level group, e.g. "primary". Nullable per the report.
  level_group?: string | null;
  // Some payloads include allowed_level_group_ids for the "school" shape.
  allowed_level_group_ids?: number[];
  allowed_level_ids: number[];
  allowed_class_ids: number[];
  allowed_channel_ids: number[];
}
