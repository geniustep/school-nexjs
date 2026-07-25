// Global platform reference subject create — POST /admin/reference-subjects.
// Distinct from operational school.subject (types/class.ts) and enable options
// (types/academic-subjects.ts).

import type { ApiResponse } from '@/types/api';

export const REFERENCE_SUBJECT_CATEGORIES = [
  'language',
  'science',
  'math',
  'social',
  'art',
  'sport',
  'religious',
  'technology',
  'other',
] as const;

export type ReferenceSubjectCategory = (typeof REFERENCE_SUBJECT_CATEGORIES)[number];

export type ReferenceSubjectApiErrorCode =
  | 'reference_subject_manage_forbidden'
  | 'reference_subject_code_conflict'
  | 'reference_subject_cycle_not_found'
  | 'reference_subject_level_not_found'
  | 'reference_subject_cycle_level_mismatch'
  | 'invalid_payload';

export interface ReferenceSubjectCycle {
  id: number;
  code: string;
  name: string;
  sequence?: number;
}

export interface ReferenceSubjectLevel {
  id: number;
  code: string;
  name: string;
  sequence?: number;
}

export interface ReferenceSubjectCreateRequest {
  name: string;
  code: string;
  cycle_id: number;
  level_ids: number[];
  subject_category: ReferenceSubjectCategory;
  is_mandatory_default: boolean;
  is_optional_default: boolean;
  weekly_sessions_default: number;
  external_reference_code: string | null;
  source_note: string | null;
  active: true;
}

export interface ReferenceSubjectCreateResult {
  id: number;
  name: string;
  code: string;
  cycle: ReferenceSubjectCycle;
  levels: ReferenceSubjectLevel[];
  subject_category: ReferenceSubjectCategory;
  is_mandatory_default: boolean;
  is_optional_default: boolean;
  weekly_sessions_default: number;
  external_reference_code: string | null;
  source_note: string | null;
  active: boolean;
  scope: 'global_reference_catalog';
}

export type ReferenceSubjectCreateResponse = ApiResponse<ReferenceSubjectCreateResult>;
