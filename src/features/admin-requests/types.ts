export type AdminRequestRole = 'parent' | 'student' | 'admin';

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
  author_role: string;
  created_at: string | null;
  attachments?: AdminRequestAttachment[];
}

export interface AdminRequest {
  id: number;
  reference?: string;
  subject?: string;
  title?: string;
  description?: string;
  state: string;
  type?: { id: number; name: string; requires_student?: boolean } | string;
  student?: { id: number; name: string } | null;
  requester_role?: string;
  created_at?: string | null;
  updated_at?: string | null;
  allowed_actions?: string[];
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
  default_priority?: 'normal' | 'important' | 'urgent';
  default_assignee?: { id: number; name: string } | null;
}

export interface AdminRequestList {
  items?: AdminRequest[];
  requests?: AdminRequest[];
  data?: AdminRequest[];
  total?: number;
}

export function requestRows(data: AdminRequest[] | AdminRequestList): AdminRequest[] {
  return Array.isArray(data) ? data : data.items ?? data.requests ?? data.data ?? [];
}

export function requestTitle(request: AdminRequest): string {
  return request.subject ?? request.title ?? request.reference ?? `#${request.id}`;
}
