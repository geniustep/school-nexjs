// Teacher resources — mirrors API_REPORT.md §3 (admin/teachers).

import type { Ref } from './api';
import type { UserAccountInfo } from './account';

export interface Teacher {
  id: number;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  login?: string | null;
  user_id?: number | null;
  account?: UserAccountInfo | null;
  classes: Ref[];
  subjects: Ref[];
  status: string;
  qualification: string | null;
  specialization: string | null;
}
