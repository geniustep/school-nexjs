import type { EdgeDevice } from '../types';
import { getEdgeDeviceConnectionState } from './edge-device-connection';

export const EDGE_ONBOARDING_POLL_MS = 1500;
export const EDGE_ONBOARDING_TIMEOUT_MS = 45_000;

export function hasNewConnectedEdgeDevice(
  before: EdgeDevice[],
  after: EdgeDevice[],
  nowMs: number = Date.now(),
): boolean {
  const beforeIds = new Set(before.map((device) => device.device_uid));
  const newDevices = after.filter((device) => !beforeIds.has(device.device_uid));
  if (newDevices.length === 0) return false;
  return getEdgeDeviceConnectionState(newDevices, nowMs).connected;
}

export function edgePairingGrantExpired(expiresAt: string, nowMs: number = Date.now()): boolean {
  const value = Date.parse(expiresAt);
  return Number.isFinite(value) && value <= nowMs;
}
