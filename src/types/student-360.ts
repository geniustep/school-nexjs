// Student 360 — School API v1 admin/students details, guardians, enrollment.

import type { Ref } from './api';
import type { UserAccountInfo } from './account';
import type { Gender, ParentLink, StudentNameFields, StudentStatus } from './student';

export type RelationshipType =
  | 'father'
  | 'mother'
  | 'legal_guardian'
  | 'grandfather'
  | 'grandmother'
  | 'brother'
  | 'sister'
  | 'uncle'
  | 'aunt'
  | 'other'
  | string;

export type GuardianRelationshipState = 'active' | 'ended' | string;

export interface AcademicLevelOption {
  id: number;
  name: string;
  code?: string | null;
  display_alias?: string | null;
  display_name?: string | null;
}

export interface AcademicClassOption {
  id: number;
  name: string;
  code?: string | null;
  display_name?: string | null;
  display_alias?: string | null;
}

export interface StudentSummary extends StudentNameFields {
  id: number;
  code?: string | null;
  massar_code?: string | null;
  matricule?: string | null;
  level?: AcademicLevelOption | null;
  class?: AcademicClassOption | null;
  school?: Ref | null;
  status: StudentStatus | string;
  gender?: Gender | null;
  date_of_birth?: string | null;
  admission_date?: string | null;
  email?: string | null;
  phone?: string | null;
  login?: string | null;
  user_id?: number | null;
  account?: UserAccountInfo | null;
  create_date?: string | null;
  write_date?: string | null;
  /** Legacy read-only */
  parents?: ParentLink[];
}

export interface StudentCapabilities {
  can_manage: boolean;
  can_manage_guardians: boolean;
  can_view_finance: boolean;
}

export interface StudentEnrollment {
  id: number;
  state: string;
  is_current?: boolean;
  date_start?: string | null;
  date_end?: string | null;
  school?: Ref | null;
  academic_year?: Ref | string | null;
  level?: AcademicLevelOption | null;
  class?: AcademicClassOption | null;
  track?: Ref | null;
}

export interface GuardianSummary {
  id: number;
  name: string;
  phone?: string | null;
  secondary_phone?: string | null;
  email?: string | null;
  address?: string | null;
  children_count?: number;
  account?: UserAccountInfo | null;
}

export interface GuardianRelationship {
  relationship_id: number;
  guardian: GuardianSummary;
  relationship_type: RelationshipType;
  is_primary_contact: boolean;
  is_legal_guardian: boolean;
  is_financial_responsible: boolean;
  receives_notifications: boolean;
  is_emergency_contact: boolean;
  is_authorized_pickup: boolean;
  contact_priority?: number | null;
  date_start?: string | null;
  date_end?: string | null;
  state: GuardianRelationshipState;
  active?: boolean;
  notes?: string | null;
}

export interface StudentDetailsData {
  student: StudentSummary;
  current_enrollment: StudentEnrollment | null;
  enrollment_history: StudentEnrollment[];
  guardian_relationships: GuardianRelationship[];
  capabilities: StudentCapabilities;
  /** Legacy flat fields — read only */
  parents?: ParentLink[];
  parent_ids?: number[];
}

export interface GuardianQuickCreatePayload {
  name: string;
  phone?: string;
  secondary_phone?: string;
  email?: string;
  address?: string;
}

export interface GuardianQuickCreateResponse {
  guardian: GuardianSummary;
}

export interface GuardianDuplicateMatch extends GuardianSummary {
  match_score?: number;
}

export interface GuardianRelationshipCreatePayload {
  guardian_id: number;
  relationship_type: RelationshipType;
  is_primary_contact?: boolean;
  is_legal_guardian?: boolean;
  is_financial_responsible?: boolean;
  receives_notifications?: boolean;
  is_emergency_contact?: boolean;
  is_authorized_pickup?: boolean;
  contact_priority?: number;
  date_start?: string;
  notes?: string;
}

export interface GuardianRelationshipUpdatePayload {
  relationship_type?: RelationshipType;
  is_primary_contact?: boolean;
  is_legal_guardian?: boolean;
  is_financial_responsible?: boolean;
  receives_notifications?: boolean;
  is_emergency_contact?: boolean;
  is_authorized_pickup?: boolean;
  contact_priority?: number;
  date_start?: string;
  notes?: string;
}

export interface GuardianRelationshipEndPayload {
  date_end?: string;
  notes?: string;
}
