export type AdminRequestRole = 'parent' | 'student' | 'admin' | 'staff';
export type AdminRequestFamilyRole = 'parent' | 'student';
export type AdminRequestReplyAuthorRole = 'parent' | 'student' | 'staff';
export type AdminRequestReplyDirection = 'requester_to_staff' | 'staff_to_requester';
export type AdminRequestReplyReviewState = 'pending_review' | 'approved' | 'changes_requested';
export type AdminRequestServiceKind = 'general' | 'appointment';
export type AdminRequestAppointmentTargetKind = 'administration' | 'subject_teacher';
export type AdminRequestAppointmentPeriod = 'morning' | 'afternoon' | 'any';
export type AdminRequestAppointmentState = 'requested' | 'proposed' | 'confirmed';

export interface AdminRequestAttachment {
  id: number;
  name: string;
  mimetype: string | null;
  size: number | null;
  created_at: string | null;
}

export interface AdminRequestReply {
  id: number;
  body: string;
  author_role: AdminRequestReplyAuthorRole;
  direction: AdminRequestReplyDirection;
  review_state: AdminRequestReplyReviewState;
  review_reason?: string | null;
  created_at: string | null;
  attachments?: AdminRequestAttachment[];
}

export interface AdminRequestAppointmentSubject {
  id: number;
  name: string;
  code?: string | null;
  label?: string | null;
}

export interface AdminRequestAppointment {
  target_kind: AdminRequestAppointmentTargetKind;
  requested_subject?: AdminRequestAppointmentSubject | null;
  preferred_date: string | null;
  preferred_period: AdminRequestAppointmentPeriod;
  preferred_time: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  appointment_state: AdminRequestAppointmentState;
  resolved_teacher?: { id: number; name: string } | null;
  resolved_user?: { id: number; name: string } | null;
  resolved_candidate_count?: number;
}

export interface AdminRequest {
  id: number;
  reference?: string;
  subject?: string;
  title?: string;
  description?: string;
  state: string;
  type?: { id: number; name: string; requires_student?: boolean; service_kind?: AdminRequestServiceKind } | string;
  student?: { id: number; name: string } | null;
  requester_role?: string;
  created_at?: string | null;
  create_date?: string | null;
  updated_at?: string | null;
  assigned?: { id: number; name: string } | null;
  assigned_at?: string | null;
  resolved_at?: string | null;
  resolution_summary?: string | null;
  allowed_actions?: string[];
  appointment?: AdminRequestAppointment | null;
  replies?: AdminRequestReply[];
  attachments?: AdminRequestAttachment[];
  [key: string]: unknown;
}

export interface AdminRequestType {
  id: number;
  name: string;
  code?: string;
  description?: string;
  active?: boolean;
  sequence?: number;
  confidential?: boolean;
  allow_parent?: boolean;
  allow_student?: boolean;
  requires_student?: boolean;
  service_kind?: AdminRequestServiceKind;
  default_priority?: 'normal' | 'important' | 'urgent';
  default_assignee?: { id: number; name: string } | null;
}

export interface AdminRequestList {
  items?: AdminRequest[];
  requests?: AdminRequest[];
  data?: AdminRequest[];
  total?: number;
}

export function adminRequestApiBase(role: AdminRequestRole): string {
  if (role === 'admin') return '/admin/admin-requests';
  if (role === 'staff') return '/staff/admin-requests';
  return `/${role}/admin-requests`;
}

export function adminRequestUiBase(role: AdminRequestRole): string {
  if (role === 'staff') return '/teacher/admin-requests';
  return `/${role}/admin-requests`;
}

export function requestRows(data: AdminRequest[] | AdminRequestList): AdminRequest[] {
  return Array.isArray(data) ? data : data.items ?? data.requests ?? data.data ?? [];
}

export function requestTitle(request: AdminRequest): string {
  return request.subject ?? request.title ?? request.reference ?? `#${request.id}`;
}
