import type { AdmissionListItem } from '@/types/admission';
export function listFixture(id: number, overrides: Partial<AdmissionListItem> = {}): AdmissionListItem {
  return { id, student_name: `S${id}`, guardian_name: null, guardian_phone: null, source: null, requested_level: null, state: 'new', next_action: null, next_action_date: null, duplicate_count: 0, offer_state: null, assigned_user: null, priority: null, ...overrides } as AdmissionListItem;
}
