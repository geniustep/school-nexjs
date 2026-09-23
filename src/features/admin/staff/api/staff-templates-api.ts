import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  normalizeStaffCreationTemplates,
  normalizeStaffTemplateCreateResult,
  normalizeStaffTemplatePreview,
} from '@/features/admin/staff/utils/staff-template-utils';
import type {
  StaffTemplateCreatePayload,
  StaffTemplateCreateResult,
  StaffTemplatePreview,
  StaffTemplatePreviewPayload,
  StaffPersonCandidate,
} from '@/types/staff-templates';
import type { ListParams } from '@/types/api';
import type { StaffCreationTemplate } from '@/types/staff-templates';

export async function fetchStaffCreationTemplates(query?: ListParams) {
  const res = await api.get<unknown>(endpoints.admin.staffTemplates, query);
  if (!res.success) return { ok: false as const, error: res.error };
  return { ok: true as const, templates: normalizeStaffCreationTemplates(res.data) };
}

export async function previewStaffCreationTemplate(
  payload: StaffTemplatePreviewPayload,
  query?: ListParams,
) {
  const res = await api.post<unknown>(endpoints.admin.staffTemplatePreview, payload, query);
  if (!res.success) return { ok: false as const, error: res.error };
  const preview = normalizeStaffTemplatePreview(res.data);
  if (!preview) {
    return {
      ok: false as const,
      error: { code: 'invalid_response', message: 'Invalid preview response.', details: {} },
    };
  }
  return { ok: true as const, preview };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function normalizeStaffPersonCandidate(value: unknown): StaffPersonCandidate | null {
  const raw = asRecord(value);
  if (!raw || typeof raw.partner_id !== 'number') return null;
  const name =
    (typeof raw.display_name === 'string' && raw.display_name.trim()) ||
    (typeof raw.name === 'string' && raw.name.trim()) ||
    '';
  if (!name) return null;
  return {
    partner_id: raw.partner_id,
    person_id: typeof raw.person_id === 'number' ? raw.person_id : raw.partner_id,
    user_id: typeof raw.user_id === 'number' ? raw.user_id : null,
    teacher_id: typeof raw.teacher_id === 'number' ? raw.teacher_id : null,
    staff_id: typeof raw.staff_id === 'number' ? raw.staff_id : null,
    name,
    name_ar: typeof raw.name_ar === 'string' ? raw.name_ar : null,
    name_fr: typeof raw.name_fr === 'string' ? raw.name_fr : null,
    phone: typeof raw.phone === 'string' ? raw.phone : null,
    email: typeof raw.email === 'string' ? raw.email : null,
    existing_roles: readStringList(raw.existing_roles),
    role_labels: readStringList(raw.role_labels),
    has_user_account: raw.has_user_account === true,
    already_staff_in_school: raw.already_staff_in_school === true,
    can_link_as_staff: raw.can_link_as_staff !== false && raw.already_staff_in_school !== true,
  };
}

export function normalizeStaffPersonCandidates(value: unknown): StaffPersonCandidate[] {
  const raw = asRecord(value);
  const items = Array.isArray(value)
    ? value
    : Array.isArray(raw?.items)
      ? raw.items
      : [];
  return items
    .map(normalizeStaffPersonCandidate)
    .filter((item): item is StaffPersonCandidate => item != null);
}

export async function searchStaffPersonCandidates(
  query: string,
  activeSchoolId?: number | null,
) {
  const q = query.trim();
  if (q.length < 2) {
    return { ok: true as const, candidates: [] as StaffPersonCandidate[] };
  }
  const res = await api.get<unknown>(endpoints.admin.staffPersonCandidates, {
    q,
    page: 1,
    page_size: 20,
    active_school_id: activeSchoolId ?? undefined,
  });
  if (!res.success) return { ok: false as const, error: res.error };
  return { ok: true as const, candidates: normalizeStaffPersonCandidates(res.data) };
}

export async function createStaffFromTemplate(
  payload: StaffTemplateCreatePayload,
  query?: ListParams,
) {
  const res = await api.post<StaffTemplateCreateResult>(endpoints.admin.staffFromTemplate, payload, query);
  if (!res.success) return { ok: false as const, error: res.error };
  return { ok: true as const, result: normalizeStaffTemplateCreateResult(res.data) };
}

export type { StaffCreationTemplate, StaffTemplatePreview };
