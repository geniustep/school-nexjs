// GET /api/v1/admin/students/{student_id}/overview — Student 360 overview contract.

import type { Ref } from './api';
import type { StudentCapabilities } from './student-360';
import type { StudentFinanceCurrency } from './student-finance';
import type { StudentConsentFlag, StudentConsentFlagKey } from '@/features/admin/students/utils/student-consent-flags';

export type {
  StudentConsentFlag,
  StudentConsentFlagKey,
  StudentConsentFlagState,
} from '@/features/admin/students/utils/student-consent-flags';

export type StudentOverviewAlertSeverity = 'info' | 'warning' | 'danger' | 'success' | string;

export interface StudentOverviewAvailableSection {
  available?: boolean;
}

export interface StudentOverviewPhoto {
  image_url?: string | null;
  thumbnail_url?: string | null;
  external_publish_allowed?: boolean;
  has_photo?: boolean;
}

export interface StudentOverviewSchooling extends StudentOverviewAvailableSection {
  school?: Ref | string | null;
  academic_year?: Ref | string | null;
  level?: { id?: number; name?: string; code?: string | null; display_name?: string | null } | null;
  class?: { id?: number; name?: string; code?: string | null; display_name?: string | null } | null;
  enrollment_state?: string | null;
  gaps?: string[];
  warnings?: string[];
}

export interface StudentOverviewFamily extends StudentOverviewAvailableSection {
  has_guardian?: boolean;
  primary_guardian_name?: string | null;
  primary_guardian_phone?: string | null;
  guardians_count?: number;
}

export interface StudentOverviewDocumentsSummary extends StudentOverviewAvailableSection {
  total?: number;
  missing?: number;
  pending_review?: number;
  accepted?: number;
  rejected?: number;
}

export type StudentOverviewConsentStatus = string;

export type StudentOverviewImportantConsentFlags = Partial<
  Record<StudentConsentFlagKey, StudentConsentFlag | null>
>;

export interface StudentOverviewConsentsSummary extends StudentOverviewAvailableSection {
  can_view?: boolean;
  can_manage?: boolean;
  important_flags?: StudentOverviewImportantConsentFlags | null;
  /** @deprecated Legacy flat status — prefer important_flags */
  trip_participation?: StudentOverviewConsentStatus | null;
  /** @deprecated Legacy flat status — prefer important_flags */
  photo_publish?: StudentOverviewConsentStatus | null;
  social_media_publish?: StudentOverviewConsentStatus | null;
  emergency_treatment?: StudentOverviewConsentStatus | null;
  school_transport?: StudentOverviewConsentStatus | null;
  pickup_authorization?: StudentOverviewConsentStatus | null;
}

export interface StudentOverviewAttendanceSummary extends StudentOverviewAvailableSection {
  absences_this_month?: number;
  late_this_month?: number;
  last_status?: string | null;
  last_status_label?: string | null;
  last_status_date?: string | null;
}

export interface StudentOverviewFinanceSummary extends StudentOverviewAvailableSection {
  currency?: StudentFinanceCurrency | null;
  total_outstanding?: number | null;
  total_overdue?: number | null;
  total_paid?: number | null;
  next_due_date?: string | null;
  status_label?: string | null;
}

export interface StudentOverviewAcademicSummary extends StudentOverviewAvailableSection {
  open_homework_count?: number;
  upcoming_exams_count?: number;
  last_result?: string | null;
  last_result_label?: string | null;
}

export interface StudentOverviewAlertAction {
  code?: string;
  label?: string;
  type?: string;
  tab?: string;
  url?: string;
}

export interface StudentOverviewAlert {
  code?: string;
  severity: StudentOverviewAlertSeverity;
  title: string;
  message?: string | null;
  action?: StudentOverviewAlertAction | null;
}

export interface StudentOverviewQuickLink {
  label: string;
  tab?: string;
  url?: string;
}

export interface StudentOverviewAllowedActions {
  edit_student?: boolean;
  archive_student?: boolean;
  manage_guardians?: boolean;
  manage_documents?: boolean;
  manage_health?: boolean;
  view_finance?: boolean;
  collect_payments?: boolean;
  [key: string]: boolean | undefined;
}

export interface StudentOverviewProfile {
  full_name?: string | null;
  registration_number?: string | null;
  status?: string | null;
  status_label?: string | null;
}

export interface StudentOverviewData {
  available?: boolean;
  student?: { id?: number; full_name?: string | null; status?: string | null } | null;
  profile?: StudentOverviewProfile | null;
  schooling?: StudentOverviewSchooling | null;
  family?: StudentOverviewFamily | null;
  photo?: StudentOverviewPhoto | null;
  documents_summary?: StudentOverviewDocumentsSummary | null;
  consents_summary?: StudentOverviewConsentsSummary | null;
  academic_summary?: StudentOverviewAcademicSummary | null;
  attendance_summary?: StudentOverviewAttendanceSummary | null;
  finance_summary?: StudentOverviewFinanceSummary | null;
  alerts?: StudentOverviewAlert[];
  quick_links?: StudentOverviewQuickLink[];
  allowed_actions?: StudentOverviewAllowedActions;
  capabilities?: StudentCapabilities;
}
