// Sibling smart fields — ADMISSIONS-STUDENT-SIBLINGS-SMART-FIELDS-1.

export type SiblingRelationship = 'brother' | 'sister' | string;

export interface SiblingLine {
  name?: string | null;
  relationship?: string | null;
  birth_date?: string | null;
  age_years_at_admission?: number | null;
  level_id?: number | null;
  level_text?: string | null;
  is_current_student?: boolean;
  linked_student_id?: number | null;
  notes?: string | null;
  sequence?: number | null;
}

export interface SiblingsFieldsSource {
  has_siblings?: boolean | null;
  siblings_levels?: string | null;
  siblings_raw_text?: string | null;
  sibling_count?: number | null;
  siblings_summary?: string | null;
  sibling_lines?: SiblingLine[] | null;
}
