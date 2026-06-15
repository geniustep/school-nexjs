// Parent / unified person profile — GET /admin/parents/{id}

import type { Ref } from './api';
import type { UserAccountInfo } from './account';
import type { StudentNameFields } from './student';
import type {
  GuardianAllowedActions,
  GuardianRemovalImpact,
  RelationshipType,
} from './student-360';

export type ParentRelation = 'father' | 'mother' | 'guardian' | string;

export interface ParentChildRelationship {
  relationship_id?: number;
  relationship_type?: RelationshipType | string;
  is_primary_contact?: boolean;
  is_legal_guardian?: boolean;
  is_financial_responsible?: boolean;
  is_emergency_contact?: boolean;
  receives_notifications?: boolean;
  is_authorized_pickup?: boolean;
  state?: string;
  active?: boolean;
  allowed_actions?: GuardianAllowedActions;
  removal_impact?: GuardianRemovalImpact;
}

export interface ParentChild extends StudentNameFields {
  id: number;
  code?: string | null;
  school_number?: string | null;
  class?: Ref | null;
  level?: Ref | null;
  relationship?: ParentChildRelationship | null;
}

export interface Parent {
  id: number;
  name: string;
  display_name?: string | null;
  phone: string | null;
  email: string | null;
  address?: string | null;
  login?: string | null;
  user_id?: number | null;
  has_account?: boolean;
  has_user_account?: boolean;
  needs_new_account?: boolean;
  account?: UserAccountInfo | null;
  /** Legacy global relation — do not show as persona label when per-child relationships exist. */
  relation: ParentRelation | null;
  existing_roles?: string[];
  role_labels?: string[];
  partner_id?: number;
  teacher_id?: number | null;
  preferred_language?: string | null;
  notification_opt_in?: boolean;
  children?: ParentChild[];
  linked_students_count?: number;
  other_children_count?: number;
  status: string;
  needs_review?: boolean;
  allowed_actions?: GuardianAllowedActions;
}
