import type { Student } from './student';

/** Single match reason returned by GET /admin/students search (Odoo contract). */
export type StudentSearchMatchedOn =
  | 'name'
  | 'guardian_phone'
  | 'guardian_identity'
  | 'massar'
  | 'student_code';

export type StudentSearchHit = Student & {
  matched_on?: StudentSearchMatchedOn;
};

/** Optional meta returned by GET /admin/students search (Odoo contract). */
export type StudentSearchResponseMeta = {
  did_you_mean?: {
    query: string;
  } | null;
};
