import type { ApiResponse } from '@/types/api';
import type {
  EdgeAudioAssetMutationData,
  EdgeAudioAssetsData,
  EdgeAudioLibraryData,
  EdgeBellScheduleData,
  EdgeBellSchedulePutInput,
  EdgeDevicesData,
} from '@/features/admin/edge/types';

async function edgeRequest<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const multipart =
      typeof FormData !== 'undefined' && init?.body instanceof FormData;
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body && !multipart ? { 'Content-Type': 'application/json' } : {}),
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

export function fetchEdgeAudioLibrary(): Promise<ApiResponse<EdgeAudioLibraryData>> {
  return edgeRequest<EdgeAudioLibraryData>('/api/admin/edge/audio-library');
}

export function uploadEdgeAudioAsset(input: {
  name: string;
  category: string;
  file: File;
}): Promise<ApiResponse<EdgeAudioAssetMutationData>> {
  const form = new FormData();
  form.set('name', input.name);
  form.set('category', input.category);
  form.set('file', input.file);
  return edgeRequest<EdgeAudioAssetMutationData>('/api/admin/edge/audio-assets', {
    method: 'POST',
    body: form,
  });
}

export function uploadEdgeAudioRevision(
  assetUid: string,
  file: File,
): Promise<ApiResponse<EdgeAudioAssetMutationData>> {
  const form = new FormData();
  form.set('file', file);
  return edgeRequest<EdgeAudioAssetMutationData>(
    `/api/admin/edge/audio-assets/${encodeURIComponent(assetUid)}/versions`,
    { method: 'POST', body: form },
  );
}

export function updateEdgeAudioAsset(
  assetUid: string,
  input: { name?: string; category?: string; active?: boolean },
): Promise<ApiResponse<EdgeAudioAssetMutationData>> {
  return edgeRequest<EdgeAudioAssetMutationData>(
    `/api/admin/edge/audio-assets/${encodeURIComponent(assetUid)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export function adoptEdgeAudioLibraryAsset(
  libraryUid: string,
): Promise<ApiResponse<EdgeAudioAssetMutationData>> {
  return edgeRequest<EdgeAudioAssetMutationData>(
    `/api/admin/edge/audio-library/${encodeURIComponent(libraryUid)}/adopt`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export function edgeAudioAssetPreviewUrl(assetUid: string): string {
  return `/api/admin/edge/audio-assets/${encodeURIComponent(assetUid)}/content`;
}

export function edgeAudioLibraryPreviewUrl(libraryUid: string): string {
  return `/api/admin/edge/audio-library/${encodeURIComponent(libraryUid)}/content`;
}

export function fetchEdgeDevices(): Promise<ApiResponse<EdgeDevicesData>> {
  return edgeRequest<EdgeDevicesData>('/api/admin/edge/devices');
}
