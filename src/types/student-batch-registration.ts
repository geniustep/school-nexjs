/**
 * Contract types for POST /api/v1/admin/students/batch-registration
 * (REGISTRATION-FINANCE-3D1 / 3D2). Client must not send school_id or family_id.
 */

export type BatchRegistrationStatus = 'completed' | 'partially_completed' | 'failed';

export type BatchChildResultStatus =
  | 'succeeded'
  | 'failed'
  | 'replayed'
  | 'skipped'
  | string;

export type BatchGuardianExistingInput = {
  client_guardian_key: string;
  guardian_id: number;
};

export type BatchGuardianNewInput = {
  client_guardian_key: string;
  guardian: {
    name: string;
    mobile?: string;
    email?: string;
  };
};

export type BatchGuardianInput = BatchGuardianExistingInput | BatchGuardianNewInput;

export type BatchChildGuardianRelationship = {
  client_guardian_key: string;
  relationship_type: string;
  is_primary_contact?: boolean;
  is_financial_responsible?: boolean;
  is_emergency_contact?: boolean;
  receives_notifications?: boolean;
  provision_access?: boolean;
};

export type BatchChildAcademicInput = {
  academic_year_id: number;
  level_id: number;
  class_id?: number;
  enrollment_date: string;
};

export type BatchChildBillingResponsibility =
  | { mode: 'guardian'; billing_guardian_id?: number }
  | { mode: 'student'; confirmed: true; reason: string };

export type BatchChildInput = {
  client_child_id: string;
  idempotency_key: string;
  first_name: string;
  last_name: string;
  name_ar?: string;
  name_latin?: string;
  code?: string;
  school_number?: string;
  massar_code?: string;
  gender?: string;
  date_of_birth?: string;
  birth_place?: string;
  nationality_id?: number;
  academic?: BatchChildAcademicInput;
  enrollment?: Record<string, unknown>;
  guardian_relationships: BatchChildGuardianRelationship[];
  billing_responsibility?: BatchChildBillingResponsibility;
  finance?: Record<string, unknown>;
};

export type BatchRegistrationRequest = {
  idempotency_key: string;
  guardians: BatchGuardianInput[];
  children: BatchChildInput[];
};

export type BatchChildError = {
  code: string;
  message?: string;
  details?: Record<string, unknown>;
  client_child_id?: string;
  field_errors?: Record<string, string>;
};

export type BatchChildResult = {
  client_child_id: string;
  status: BatchChildResultStatus;
  student_id?: number | null;
  student_reference?: string | null;
  student?: Record<string, unknown> | null;
  replayed?: boolean;
  finance?: Record<string, unknown> | null;
  error?: BatchChildError | null;
  retryable?: boolean;
};

export type BatchGuardianResolved = {
  client_guardian_key: string;
  guardian_id?: number;
  partner_id?: number;
  created?: boolean;
};

export type BatchRegistrationResponse = {
  idempotency_key: string;
  status: BatchRegistrationStatus;
  requested_count: number;
  succeeded_count: number;
  failed_count: number;
  replayed?: boolean;
  guardians_resolved?: BatchGuardianResolved[];
  children: BatchChildResult[];
};
