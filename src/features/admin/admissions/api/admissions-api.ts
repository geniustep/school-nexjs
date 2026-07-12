'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  AdmissionDetail,
  AdmissionListItem,
  AdmissionPrefill,
  AdmissionsDashboard,
  CreateActivityPayload,
  CreateAdmissionPayload,
  CreateAppointmentPayload,
  CreateAssessmentPayload,
  CreateDecisionPayload,
  CreateOfferPayload,
  PatchAdmissionPayload,
  ReopenAdmissionPayload,
  AdmissionPrefillApiEnvelope,
} from '@/types/admission';
import {
  normalizeAdmissionDetail,
  normalizeAdmissionListItems,
} from '../utils/normalize-admission-record';
import { unwrapAdmissionPrefill } from '../utils/admission-prefill-unwrap';

export async function fetchAdmissionsDashboard(
  query?: ListParams,
): Promise<ApiResponse<AdmissionsDashboard>> {
  return api.get<AdmissionsDashboard>(endpoints.admin.admissionsDashboard, query);
}

export async function fetchAdmissions(
  query?: ListParams,
): Promise<ApiResponse<AdmissionListItem[]>> {
  const res = await api.get<AdmissionListItem[]>(endpoints.admin.admissions, query);
  if (res.success && Array.isArray(res.data)) {
    return { ...res, data: normalizeAdmissionListItems(res.data) };
  }
  return res;
}

export async function fetchAdmission(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<AdmissionDetail>> {
  const res = await api.get<AdmissionDetail>(endpoints.admin.admission(id), query);
  if (res.success && res.data) {
    return { ...res, data: normalizeAdmissionDetail(res.data) };
  }
  return res;
}

export async function createAdmission(
  payload: CreateAdmissionPayload,
  query?: ListParams,
): Promise<ApiResponse<AdmissionDetail>> {
  return api.post<AdmissionDetail>(endpoints.admin.admissions, payload, query);
}

export async function patchAdmission(
  id: number | string,
  payload: PatchAdmissionPayload,
  query?: ListParams,
): Promise<ApiResponse<AdmissionDetail>> {
  return api.patch<AdmissionDetail>(endpoints.admin.admission(id), payload, query);
}

export async function fetchAdmissionPrefill(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<AdmissionPrefill>> {
  const res = await api.get<AdmissionPrefillApiEnvelope | AdmissionPrefill>(
    endpoints.admin.admissionPrefill(id),
    query,
  );
  if (res.success && res.data) {
    return { ...res, data: unwrapAdmissionPrefill(res.data) };
  }
  return res as ApiResponse<AdmissionPrefill>;
}

export async function createAdmissionActivity(
  id: number | string,
  payload: CreateActivityPayload,
  query?: ListParams,
): Promise<ApiResponse<AdmissionDetail>> {
  return api.post<AdmissionDetail>(endpoints.admin.admissionActivities(id), payload, query);
}

export async function createAdmissionAppointment(
  id: number | string,
  payload: CreateAppointmentPayload,
  query?: ListParams,
): Promise<ApiResponse<AdmissionDetail>> {
  return api.post<AdmissionDetail>(endpoints.admin.admissionAppointments(id), payload, query);
}

export async function createAdmissionAssessment(
  id: number | string,
  payload: CreateAssessmentPayload,
  query?: ListParams,
): Promise<ApiResponse<AdmissionDetail>> {
  return api.post<AdmissionDetail>(endpoints.admin.admissionAssessments(id), payload, query);
}

export async function createAdmissionDecision(
  id: number | string,
  payload: CreateDecisionPayload,
  query?: ListParams,
): Promise<ApiResponse<AdmissionDetail>> {
  const res = await api.post<AdmissionDetail>(endpoints.admin.admissionDecision(id), payload, query);
  if (res.success && res.data) {
    return { ...res, data: normalizeAdmissionDetail(res.data) };
  }
  return res;
}

export async function reopenAdmission(
  id: number | string,
  payload: ReopenAdmissionPayload,
  query?: ListParams,
): Promise<ApiResponse<AdmissionDetail>> {
  const res = await api.post<AdmissionDetail>(endpoints.admin.admissionReopen(id), payload, query);
  if (res.success && res.data) {
    return { ...res, data: normalizeAdmissionDetail(res.data) };
  }
  return res;
}

export async function createAdmissionOffer(
  id: number | string,
  payload: CreateOfferPayload,
  query?: ListParams,
): Promise<ApiResponse<AdmissionDetail>> {
  return api.post<AdmissionDetail>(endpoints.admin.admissionOffers(id), payload, query);
}

export async function sendAdmissionOffer(
  admissionId: number | string,
  offerId: number | string,
  query?: ListParams,
): Promise<ApiResponse<AdmissionDetail>> {
  return api.post<AdmissionDetail>(
    endpoints.admin.admissionOfferSend(admissionId, offerId),
    undefined,
    query,
  );
}

export async function acceptAdmissionOffer(
  admissionId: number | string,
  offerId: number | string,
  query?: ListParams,
): Promise<ApiResponse<AdmissionDetail>> {
  return api.post<AdmissionDetail>(
    endpoints.admin.admissionOfferAccept(admissionId, offerId),
    undefined,
    query,
  );
}

export async function declineAdmissionOffer(
  admissionId: number | string,
  offerId: number | string,
  query?: ListParams,
): Promise<ApiResponse<AdmissionDetail>> {
  return api.post<AdmissionDetail>(
    endpoints.admin.admissionOfferDecline(admissionId, offerId),
    undefined,
    query,
  );
}

export async function linkAdmissionStudent(
  admissionId: number | string,
  studentId: number,
  query?: ListParams,
): Promise<ApiResponse<AdmissionDetail>> {
  const res = await api.post<AdmissionDetail>(
    endpoints.admin.admissionLinkStudent(admissionId),
    { student_id: studentId },
    query,
  );
  if (res.success && res.data) {
    return { ...res, data: normalizeAdmissionDetail(res.data) };
  }
  return res;
}
