'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { AcademicTrack, TrackOptions } from '@/types/academic-setup';
import type { ListParams } from '@/types/api';

export function useTracksList(query?: ListParams) {
  const state = useAdminResource<AcademicTrack[]>(endpoints.admin.tracks, query);
  const reload = useCallback(() => state.reload(), [state]);
  return {
    tracks: state.data ?? [],
    loading: state.loading,
    error: state.error,
    meta: state.meta,
    reload,
  };
}

export function useTrackOptions() {
  const state = useAdminResource<TrackOptions>(endpoints.admin.trackOptions);
  return {
    options: state.data,
    loading: state.loading,
    error: state.error,
    reload: state.reload,
  };
}

export function useTrackDetail(id: number | null) {
  return useAdminResource<AcademicTrack>(id ? endpoints.admin.track(id) : null);
}

export async function createTrack(payload: Record<string, unknown>) {
  return api.post<AcademicTrack>(endpoints.admin.tracks, payload);
}

export async function updateTrack(id: number, payload: Record<string, unknown>) {
  return api.post<AcademicTrack>(endpoints.admin.trackUpdate(id), payload);
}

export async function deleteTrack(id: number) {
  return api.delete<{ action?: string }>(endpoints.admin.track(id));
}
