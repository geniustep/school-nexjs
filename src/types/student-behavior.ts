export type BehaviorCategory =
  | 'discipline'
  | 'uniform'
  | 'homework'
  | 'attendance'
  | 'respect'
  | 'violence'
  | 'property_safety'
  | 'integrity';

export type BehaviorSeverity = 'minor' | 'moderate' | 'serious' | 'critical';

export interface BehaviorEventType {
  id: number;
  code: string;
  name: string;
  category: BehaviorCategory;
  default_delta: number;
  severity: BehaviorSeverity;
  note_required: boolean;
  incident_required: boolean;
}

export interface BehaviorIncident {
  id: number;
  event_id: number;
  state: 'open' | 'resolved' | 'cancelled';
  description: string;
  occurred_at: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
}

export interface BehaviorEvent {
  id: number;
  type: BehaviorEventType;
  occurred_at: string | null;
  recorded_at: string | null;
  class: { id: number; name: string } | null;
  note: string | null;
  source: 'manual' | 'attendance' | 'homework' | 'system';
  policy_version: string;
  policy_delta: number;
  applied_delta: number;
  state: 'active' | 'reversed';
  actor: { id: number; name: string } | null;
  teacher: { id: number; name: string } | null;
  incident: BehaviorIncident | null;
}

export interface BehaviorTransaction {
  id: number;
  kind: 'event' | 'reversal' | 'recovery';
  delta: number;
  balance_before: number;
  balance_after: number;
  reason: string | null;
  event_id: number | null;
  created_at: string | null;
  actor_user: { id: number; name: string } | null;
}

export interface BehaviorAllowedActions {
  record_event: boolean;
  reverse_event: boolean;
  recover: boolean;
  resolve_incident: boolean;
}

export interface StudentBehaviorSnapshot {
  student_id: number;
  academic_year: { id: number; name: string };
  account_id: number | null;
  starting_balance: number;
  current_balance: number;
  policy_version: string;
  events: BehaviorEvent[];
  transactions: BehaviorTransaction[];
  open_incidents: number;
  allowed_actions: BehaviorAllowedActions;
}

export interface BehaviorEventCatalog {
  items: BehaviorEventType[];
}

export interface BehaviorEventCreateResponse {
  event: BehaviorEvent;
  snapshot: StudentBehaviorSnapshot;
}
