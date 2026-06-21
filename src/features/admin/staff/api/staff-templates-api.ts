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

export async function createStaffFromTemplate(
  payload: StaffTemplateCreatePayload,
  query?: ListParams,
) {
  const res = await api.post<StaffTemplateCreateResult>(endpoints.admin.staffFromTemplate, payload, query);
  if (!res.success) return { ok: false as const, error: res.error };
  return { ok: true as const, result: normalizeStaffTemplateCreateResult(res.data) };
}

export type { StaffCreationTemplate, StaffTemplatePreview };
