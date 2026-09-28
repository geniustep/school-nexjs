import { describe, expect, it } from 'vitest';
import type { EdgeDevice } from '../types';
import {
  getEdgeDeviceConnectionState,
  parseEdgeLastSeenUtc,
} from './edge-device-connection';

const NOW = Date.parse('2026-09-28T09:00:00Z');

function device(patch: Partial<EdgeDevice> = {}): EdgeDevice {
  return {
    device_uid: 'edg_1',
    name: 'Raqeem Edge',
    hostname: 'bell-pc',
    platform: 'windows',
    agent_version: '0.1.0',
    active: true,
    revoked_at: null,
    last_seen_at: '2026-09-28 08:59:00',
    ...patch,
  };
}

describe('Raqeem Edge connection state', () => {
  it('treats no devices as disconnected', () => {
    expect(getEdgeDeviceConnectionState([], NOW).connected).toBe(false);
  });

  it('treats an active fresh device as connected', () => {
    expect(getEdgeDeviceConnectionState([device()], NOW).connected).toBe(true);
  });

  it('treats an active stale device older than 180 seconds as disconnected', () => {
    expect(
      getEdgeDeviceConnectionState([device({ last_seen_at: '2026-09-28 08:56:59' })], NOW)
        .connected,
    ).toBe(false);
  });

  it('treats a revoked fresh device as disconnected', () => {
    expect(
      getEdgeDeviceConnectionState(
        [device({ revoked_at: '2026-09-28 08:59:30' })],
        NOW,
      ).connected,
    ).toBe(false);
  });

  it('uses a fresh eligible device when multiple devices exist', () => {
    const state = getEdgeDeviceConnectionState(
      [
        device({ device_uid: 'old', last_seen_at: '2026-09-28 08:50:00' }),
        device({ device_uid: 'fresh', last_seen_at: '2026-09-28 08:58:30' }),
      ],
      NOW,
    );
    expect(state.connected).toBe(true);
    expect(state.device?.device_uid).toBe('fresh');
  });

  it('parses Odoo datetimes without a timezone suffix as UTC', () => {
    expect(parseEdgeLastSeenUtc('2026-09-28 08:59:00')).toBe(
      Date.parse('2026-09-28T08:59:00Z'),
    );
  });
});
