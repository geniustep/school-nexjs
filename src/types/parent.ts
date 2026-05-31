// Parent resources — mirrors API_REPORT.md §3 (admin/parents).

import type { Ref } from './api';

export type ParentRelation = 'father' | 'mother' | 'guardian' | string;

export interface ParentChild {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  full_name: string;
  name?: string | null;
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
  children: ParentChild[];
  status: string;
}
