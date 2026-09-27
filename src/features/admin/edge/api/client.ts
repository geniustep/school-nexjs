import type { ApiResponse } from '@/types/api';
import type {
  EdgeAudioAssetsData,
  EdgeBellScheduleData,
  EdgeBellSchedulePutInput,
  EdgeDevicesData,
} from '@/features/admin/edge/types';

async function edgeRequest<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
      cache: 'no-store',
    });
    const body = (await response.json()) as ApiResponse<T>;
    if (body && typeof body === 'object' && 'success' in body) return body;
    return {
      success: false,
      error: { code: 'server_error', message: 'Invalid Raqeem Edge response.', details: {} },
      meta: {},
    };
  } catch {
    return {
      success: false,
      error: { code: 'network_error', message: 'Network error.', details: {} },
      meta: {},
    };
  }
}

export function fetchEdgeBellSchedule(): Promise<ApiResponse<EdgeBellScheduleData>> {
  return edgeRequest<EdgeBellScheduleData>('/api/admin/edge/bell-schedule');
}

export function saveEdgeBellSchedule(
  input: EdgeBellSchedulePutInput,
): Promise<ApiResponse<EdgeBellScheduleData>> {
  return edgeRequest<EdgeBellScheduleData>('/api/admin/edge/bell-schedule', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function fetchEdgeAudioAssets(): Promise<ApiResponse<EdgeAudioAssetsData>> {
  return edgeRequest<EdgeAudioAssetsData>('/api/admin/edge/audio-assets');
}

export function fetchEdgeDevices(): Promise<ApiResponse<EdgeDevicesData>> {
  return edgeRequest<EdgeDevicesData>('/api/admin/edge/devices');
}
