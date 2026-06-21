import type { Ref } from '@/types/api';
import type { AdmissionState } from '@/types/admission';

export const ACTIVE_KANBAN_STATES: AdmissionState[] = [
  'new',
  'contacted',
  'qualified',
  'visit_pending',
  'under_review',
  'accepted',
  'offer_sent',
  'confirmed',
  'waitlisted',
];

export const CLOSED_KANBAN_STATES: AdmissionState[] = ['lost', 'cancelled', 'duplicate'];

export const ALL_KANBAN_STATES: AdmissionState[] = [
  ...ACTIVE_KANBAN_STATES,
  ...CLOSED_KANBAN_STATES,
];

export function refName(value: Ref | string | null | undefined): string {
  if (!value) return '';
  return typeof value === 'string' ? value : value.name;
}

export function refId(value: Ref | null | undefined): number | null {
  if (!value || typeof value === 'string') return null;
  return value.id;
}

export function isOverdueNextAction(date: string | null | undefined): boolean {
  if (!date) return false;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

export function admissionStateTone(state: string): 'green' | 'red' | 'amber' | 'blue' | 'slate' {
  switch (state) {
    case 'confirmed':
    case 'accepted':
      return 'green';
    case 'lost':
    case 'cancelled':
    case 'duplicate':
      return 'red';
    case 'visit_pending':
    case 'under_review':
    case 'waitlisted':
      return 'amber';
    case 'offer_sent':
    case 'qualified':
      return 'blue';
    default:
      return 'slate';
  }
}

export function formatAdmissionReference(id: number, reference?: string | null): string {
  if (reference?.trim()) return reference.trim();
  return `#${id}`;
}

/** Strip empty, null-ish, and boolean string noise from display fields. */
export function cleanDisplayValue(value: string | null | undefined): string {
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower === 'false' || lower === 'null' || lower === 'undefined') return '';
  return trimmed;
}
