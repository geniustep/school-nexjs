// Executive director dashboard — Odoo GET /admin/dashboard/executive contract.

export type ExecutiveAlertSeverity = 'info' | 'warning' | 'critical';

export interface ExecutiveAcademicYear {
  id: number;
  name: string;
}

export interface ExecutiveFinanceSummary {
  currency: string;
  collected_today: number;
  collected_month: number;
  remaining: number;
  overdue: number;
  families_overdue_count: number;
  promises_due_soon_count: number;
  source: string;
}

export interface ExecutiveAdmissionsSummary {
  open: number;
  new: number;
  in_progress: number;
  qualified: number;
  accepted: number;
  overdue_actions: number;
  conversion_candidates: number;
}

export interface ExecutiveAttendanceGaps {
  classes_without_attendance_count: number | null;
  absent_today_count: number;
  late_today_count: number;
  attendance_rate_today: number;
}

export interface ExecutiveStaffAlert {
  code: string;
  message: string;
  href: string | null;
  severity: ExecutiveAlertSeverity;
}

export interface ExecutiveImportantAlert {
  type: string;
  code: string;
  message: string;
  href: string | null;
  severity: ExecutiveAlertSeverity;
}

export interface ExecutiveDataQuality {
  students_missing_guardian_count?: number;
  students_missing_required_data_count?: number;
  students_missing_massar_count?: number;
}

export interface ExecutiveQuickLink {
  code: string;
  label: string;
  href: string;
}

export interface AdminExecutiveDashboard {
  active_academic_year: ExecutiveAcademicYear | null;
  finance_summary: ExecutiveFinanceSummary | null;
  admissions_summary: ExecutiveAdmissionsSummary | null;
  attendance_gaps: ExecutiveAttendanceGaps | null;
  staff_alerts: ExecutiveStaffAlert[];
  important_alerts: ExecutiveImportantAlert[];
  data_quality: ExecutiveDataQuality | null;
  quick_links: ExecutiveQuickLink[];
}
