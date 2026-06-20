// Admissions API types — ADMISSION-CORE-1 / ADMISSION-WORKFLOW-1.

import type { Ref } from './api';

export type AdmissionState =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'visit_pending'
  | 'under_review'
  | 'accepted'
  | 'waitlisted'
  | 'offer_sent'
  | 'confirmed'
  | 'lost'
  | 'cancelled'
  | 'duplicate';

export type ActivityType = 'note' | 'call' | 'whatsapp' | 'follow_up' | 'visit_note';

export type DecisionType =
  | 'accepted'
  | 'accepted_with_condition'
  | 'waitlisted'
  | 'rejected'
  | 'needs_reassessment';

export interface AdmissionsDashboard {
  total_open: number;
  new_count: number;
  visit_pending_count: number;
  under_review_count: number;
  accepted_count: number;
  offer_sent_count: number;
  confirmed_count: number;
  lost_count: number;
  today_appointments: number;
  overdue_next_actions: number;
}

export interface AdmissionListItem {
  id: number;
  reference?: string | null;
  student_name: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  source: Ref | string | null;
  requested_level: Ref | string | null;
  state: AdmissionState | string;
  next_action: string | null;
  next_action_date: string | null;
  duplicate_count: number;
  offer_state: string | null;
  assigned_user: Ref | string | null;
  priority: string | null;
}

export interface AdmissionAllowedActions {
  edit?: boolean;
  schedule_appointment?: boolean;
  add_assessment?: boolean;
  decide?: boolean;
  create_offer?: boolean;
  send_offer?: boolean;
  accept_offer?: boolean;
  decline_offer?: boolean;
  get_prefill?: boolean;
  link_student?: boolean;
}

export type AdmissionRegistrationFlowState =
  | 'not_started'
  | 'in_progress'
  | 'linked'
  | string;

export interface AdmissionActivity {
  id: number;
  activity_type: string;
  note: string | null;
  user: Ref | string | null;
  date: string;
  next_action: string | null;
  next_action_date: string | null;
}

export interface AdmissionAppointment {
  id: number;
  appointment_type: string;
  state: string;
  scheduled_at: string;
  assigned_user: Ref | string | null;
  notes: string | null;
  result_notes: string | null;
}

export interface AdmissionAssessment {
  id: number;
  assessment_type: string;
  state: string;
  assessment_date: string;
  score: number | null;
  max_score: number | null;
  result: string | null;
  recommendation: string | null;
  teacher_notes: string | null;
}

export interface AdmissionDecision {
  decision: string | null;
  decision_date: string | null;
  decision_user: Ref | string | null;
  decision_notes: string | null;
  conditions: string | null;
}

export interface AdmissionOffer {
  id: number;
  state: string;
  level: Ref | string | null;
  proposed_class: Ref | string | null;
  registration_fee: number | null;
  monthly_fee: number | null;
  deadline_date: string | null;
  required_documents: string | null;
  notes: string | null;
}

export interface AdmissionDuplicate {
  id: number;
  reference?: string | null;
  student_name: string;
  state: string;
  guardian_phone?: string | null;
}

export interface AdmissionDetail {
  id: number;
  reference?: string | null;
  name?: string | null;
  state: AdmissionState | string;
  student_id?: number | false | null;
  registration_flow_state?: AdmissionRegistrationFlowState | null;
  student_name: string;
  student_first_name?: string | null;
  student_last_name?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  previous_school?: string | null;
  massar_code?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_whatsapp?: string | null;
  guardian_email?: string | null;
  relationship?: string | null;
  school?: Ref | null;
  academic_year?: Ref | null;
  source?: Ref | null;
  requested_level?: Ref | null;
  requested_class?: Ref | null;
  assigned_user?: Ref | null;
  next_action?: string | null;
  next_action_date?: string | null;
  first_contact_date?: string | null;
  internal_notes?: string | null;
  priority?: string | null;
  duplicate_count?: number;
  offer_state?: string | null;
  activities?: AdmissionActivity[];
  appointments?: AdmissionAppointment[];
  assessments?: AdmissionAssessment[];
  decision?: AdmissionDecision | null;
  offers?: AdmissionOffer[];
  duplicates?: AdmissionDuplicate[];
  allowed_actions: AdmissionAllowedActions;
  readiness?: Record<string, unknown> | null;
  prefill_status?: string | null;
}

export interface AdmissionPrefill {
  source?: Record<string, unknown> | null;
  student?: Record<string, unknown> | null;
  guardian?: Record<string, unknown> | null;
  academic?: Record<string, unknown> | null;
  admission?: Record<string, unknown> | null;
  readiness?: Record<string, unknown> | null;
  warnings?: string[];
  blocking_issues?: string[];
}

export interface AdmissionPrefillApiEnvelope {
  prefill?: AdmissionPrefill | null;
  allowed_actions?: string[] | AdmissionAllowedActions;
}

export interface CreateAdmissionPayload {
  student_name?: string;
  student_first_name?: string;
  student_last_name?: string;
  birth_date?: string;
  gender?: string;
  school_id?: number;
  academic_year_id?: number;
  source_id?: number;
  requested_level_id?: number;
  requested_class_id?: number;
  previous_school?: string;
  massar_code?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_whatsapp?: string;
  guardian_email?: string;
  relationship?: string;
  first_contact_date?: string;
  next_action?: string;
  next_action_date?: string;
  internal_notes?: string;
}

export interface PatchAdmissionPayload {
  next_action?: string;
  next_action_date?: string;
  internal_notes?: string;
  assigned_user_id?: number;
  priority?: string;
  state?: string;
}

export interface CreateActivityPayload {
  activity_type: ActivityType | string;
  note?: string;
  next_action?: string;
  next_action_date?: string;
}

export interface CreateAppointmentPayload {
  appointment_type: string;
  scheduled_at: string;
  duration_minutes?: number;
  assigned_user_id?: number;
  notes?: string;
}

export interface CreateAssessmentPayload {
  assessment_type: string;
  assessment_date: string;
  requested_level_id?: number;
  subject_id?: number;
  score?: number;
  max_score?: number;
  result?: string;
  recommendation?: string;
  teacher_notes?: string;
}

export interface CreateDecisionPayload {
  decision: DecisionType | string;
  decision_notes?: string;
  conditions?: string;
}

export interface CreateOfferPayload {
  level_id?: number;
  proposed_class_id?: number;
  registration_fee?: number;
  monthly_fee?: number;
  deadline_date?: string;
  required_documents?: string;
  notes?: string;
}
