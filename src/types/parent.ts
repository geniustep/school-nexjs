// Parent resources — mirrors API_REPORT.md §3 (admin/parents).

import type { Ref } from './api';
import type { StudentNameFields } from './student';

export type ParentRelation = 'father' | 'mother' | 'guardian' | string;

export interface ParentChild extends StudentNameFields {
  id: number;
  class: Ref | null;
}

export interface Parent {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  relation: ParentRelation | null;
  preferred_language?: string | null;
  notification_opt_in?: boolean;
  /** Linked pupils via M2M; may be empty. */
  children?: ParentChild[];
  status: string;
}
