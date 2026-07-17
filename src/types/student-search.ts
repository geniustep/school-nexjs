import type { Student } from './student';

/** Single match reason returned by GET /admin/students search (Odoo contract). */
export type StudentSearchMatchedOn =
  | 'name'
  | 'guardian_phone'
  | 'guardian_identity'
  | 'massar'
  | 'student_code';

/**
 * Search list hit from GET /admin/students.
 * `name_ar` / `name_latin` are present on the Odoo list payload (fmt_student_full)
 * and are optional when a school has not filled them.
 */
export type StudentSearchHit = Student & {
  matched_on?: StudentSearchMatchedOn;
  name_ar?: string | null;
  name_latin?: string | null;
};

/** Optional meta returned by GET /admin/students search (Odoo contract). */
export type StudentSearchResponseMeta = {
  did_you_mean?: {
    query: string;
  } | null;
};
