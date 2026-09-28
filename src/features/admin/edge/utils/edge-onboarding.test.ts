import { describe, expect, it } from 'vitest';
import type { EdgeDevice } from '../types';
import { edgePairingGrantExpired, hasNewConnectedEdgeDevice } from './edge-onboarding';

const NOW = Date.parse('2026-09-28T15:00:00Z');

function device(uid: string, lastSeen = '2026-09-28 14:59:30'): EdgeDevice {
  return {
    device_uid: uid,
    name: 'Raqeem Edge',
    hostname: 'bell-pc',
    platform: 'windows',
    agent_version: '0.1.0',
    active: true,
    revoked_at: null,
    last_seen_at: lastSeen,
  };
}

describe('Edge onboarding helpers', () => {
  it('confirms only a newly linked fresh device', () => {
    const before = [device('existing')];
    expect(hasNewConnectedEdgeDevice(before, [...before, device('new')], NOW)).toBe(true);
    expect(hasNewConnectedEdgeDevice(before, before, NOW)).toBe(false);
  });

  it('does not turn an existing stale device into an unlinked state', () => {
    const before = [device('existing', '2026-09-28 14:50:00')];
    expect(hasNewConnectedEdgeDevice(before, before, NOW)).toBe(false);
  });

  it('detects an expired pairing grant', () => {
    expect(edgePairingGrantExpired('2026-09-28T14:59:59Z', NOW)).toBe(true);
    expect(edgePairingGrantExpired('2026-09-28T15:10:00Z', NOW)).toBe(false);
  });
});
