import type { EdgeDevice } from '../types';

export const EDGE_DEVICE_FRESHNESS_MS = 180_000;
const ALLOWED_CLOCK_SKEW_MS = 30_000;

export type EdgeDeviceConnectionReason = 'connected' | 'no_device' | 'stale';

export interface EdgeDeviceConnectionState {
  connected: boolean;
  reason: EdgeDeviceConnectionReason;
  device: EdgeDevice | null;
  last_seen_at: string | null;
}

export function normalizeEdgeLastSeenUtc(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const isoLike = raw.replace(' ', 'T');
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(isoLike) ? isoLike : `${isoLike}Z`;
}

export function parseEdgeLastSeenUtc(value: string | null | undefined): number | null {
  const normalized = normalizeEdgeLastSeenUtc(value);
  if (!normalized) return null;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getEdgeDeviceConnectionState(
  devices: EdgeDevice[],
  nowMs: number = Date.now(),
): EdgeDeviceConnectionState {
  if (devices.length === 0) {
    return { connected: false, reason: 'no_device', device: null, last_seen_at: null };
  }

  const eligible = devices.filter((device) => device.active && !device.revoked_at);
  if (eligible.length === 0) {
    return {
      connected: false,
      reason: 'stale',
      device: devices[0] ?? null,
      last_seen_at: devices[0]?.last_seen_at ?? null,
    };
  }

  const seen = eligible
    .map((device) => ({ device, seenAt: parseEdgeLastSeenUtc(device.last_seen_at) }))
    .filter((entry): entry is { device: EdgeDevice; seenAt: number } => entry.seenAt !== null)
    .sort((a, b) => b.seenAt - a.seenAt);

  const freshest = seen[0];
  if (!freshest) {
    return {
      connected: false,
      reason: 'stale',
      device: eligible[0] ?? null,
      last_seen_at: eligible[0]?.last_seen_at ?? null,
    };
  }

  const ageMs = nowMs - freshest.seenAt;
  const connected = ageMs >= -ALLOWED_CLOCK_SKEW_MS && ageMs <= EDGE_DEVICE_FRESHNESS_MS;
  return {
    connected,
    reason: connected ? 'connected' : 'stale',
    device: freshest.device,
    last_seen_at: freshest.device.last_seen_at,
  };
}
