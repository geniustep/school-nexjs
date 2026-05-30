// Parent resources — mirrors API_REPORT.md §3 (admin/parents).

import type { Ref } from './api';

export type ParentRelation = 'father' | 'mother' | 'guardian' | string;

export interface ParentChild {
  id: number;
  full_name: string;
  class: Ref | null;
}

export interface Parent {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  relation: ParentRelation | null;
  children: ParentChild[];
  status: string;
}
