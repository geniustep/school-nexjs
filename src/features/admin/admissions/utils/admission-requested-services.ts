import type {
  AdmissionDetail,
  AdmissionRequestedService,
  AdmissionRequestedServiceCount,
} from '@/types/admission';
import { resolveAdmissionStudentId } from './admission-registration';

export function dedupeRequestedServiceIds(ids: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of ids) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    const id = Math.trunc(n);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function normalizeRequestedServiceIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const collected: number[] = [];
  for (const item of raw) {
    if (typeof item === 'number' || typeof item === 'string') {
      collected.push(Number(item));
      continue;
    }
    if (item && typeof item === 'object' && 'id' in item) {
      collected.push(Number((item as { id: unknown }).id));
    }
  }
  return dedupeRequestedServiceIds(collected);
}

export function normalizeAdmissionRequestedService(
  raw: unknown,
): AdmissionRequestedService | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const id = Number(obj.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const code = obj.code == null || obj.code === false ? '' : String(obj.code).trim();
  const nameRaw = obj.name == null || obj.name === false ? '' : String(obj.name).trim();
  return {
    id: Math.trunc(id),
    code,
    name: nameRaw || code || String(Math.trunc(id)),
    active: obj.active !== false,
  };
}

export function normalizeAdmissionRequestedServices(raw: unknown): AdmissionRequestedService[] {
  if (!Array.isArray(raw)) return [];
  const out: AdmissionRequestedService[] = [];
  const seen = new Set<number>();
  for (const item of raw) {
    const normalized = normalizeAdmissionRequestedService(item);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    out.push(normalized);
  }
  return out;
}

export function normalizeHasRequestedServices(
  raw: unknown,
  services?: AdmissionRequestedService[],
  ids?: number[],
): boolean {
  if (typeof raw === 'boolean') return raw;
  if (Array.isArray(ids) && ids.length > 0) return true;
  if (Array.isArray(services) && services.length > 0) return true;
  if (raw === 'true' || raw === 1) return true;
  if (raw === 'false' || raw === 0) return false;
  return false;
}

export function normalizeRequestedServiceCounts(raw: unknown): AdmissionRequestedServiceCount[] {
  if (!Array.isArray(raw)) return [];
  const out: AdmissionRequestedServiceCount[] = [];
  const seen = new Set<number>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    // Backend may send service_id (contract) or id (dashboard payload on school).
    const serviceId = Number(obj.service_id ?? obj.id);
    if (!Number.isFinite(serviceId) || serviceId <= 0) continue;
    const id = Math.trunc(serviceId);
    if (seen.has(id)) continue;
    seen.add(id);
    const name = obj.name == null || obj.name === false ? '' : String(obj.name).trim();
    const code =
      obj.code == null || obj.code === false ? null : String(obj.code).trim() || null;
    const count = Number(obj.count);
    out.push({
      service_id: id,
      code,
      name: name || code || String(id),
      count: Number.isFinite(count) ? count : 0,
    });
  }
  return out;
}

export function sliceRequestedServiceLabels(
  services: AdmissionRequestedService[],
  maxVisible = 2,
): { visible: AdmissionRequestedService[]; remaining: number } {
  const limit = Math.max(0, maxVisible);
  const visible = services.slice(0, limit);
  return {
    visible,
    remaining: Math.max(0, services.length - visible.length),
  };
}

export function isAdmissionRequestedServicesLocked(
  detail: Pick<AdmissionDetail, 'application_status' | 'registration_status' | 'student_id'>,
): boolean {
  if (detail.application_status === 'registered') return true;
  if (detail.registration_status === 'registered') return true;
  return resolveAdmissionStudentId(detail.student_id) != null;
}

/** Map backend requested-services error codes to localized messages. */
export function mapAdmissionRequestedServicesError(
  code: string | undefined,
  t: (key: string) => string,
): string {
  if (!code) return t('admin.admissions.requestedServices.errors.unknown');
  const known = [
    'admission_requested_service_not_found',
    'admission_requested_service_inactive',
    'admission_requested_service_wrong_school',
    'admission_requested_services_locked_after_registration',
  ] as const;
  if ((known as readonly string[]).includes(code)) {
    return t(`admin.admissions.requestedServices.errors.${code}`);
  }
  return t('admin.admissions.requestedServices.errors.unknown');
}
