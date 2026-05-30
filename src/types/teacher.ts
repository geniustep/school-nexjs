// Teacher resources — mirrors API_REPORT.md §3 (admin/teachers).

import type { Ref } from './api';

export interface Teacher {
  id: number;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  classes: Ref[];
  subjects: Ref[];
  status: string;
  qualification: string | null;
  specialization: string | null;
}
