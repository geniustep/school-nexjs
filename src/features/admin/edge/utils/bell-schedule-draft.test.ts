import { describe, expect, it } from 'vitest';
import {
  copyDayEvents,
  createBellEventDraft,
  hydrateBellScheduleDraft,
  removeBellEventDraft,
  toBellSchedulePutInput,
  validateBellScheduleDraft,
} from './bell-schedule-draft';
import type { BellScheduleDraft } from '@/features/admin/edge/types';

function baseDraft(): BellScheduleDraft {
  return {
    schedule_id: 4,
    name: 'Main',
    range_start: '2026-09-28',
    range_end: '2026-12-31',
    events: [
      {
        client_key: 'db-1',
        id: 1,
        weekday: '0',
        local_time: '08:00',
        label: 'Start',
        audio_asset_uid: 'aud_1',
        active: true,
      },
    ],
  };
}

describe('bell schedule draft', () => {
  it('adds and removes a local event', () => {
    const created = createBellEventDraft('1', 'aud_1');
    expect(created.id).toBeNull();
    expect(created.weekday).toBe('1');
    expect(created.audio_asset_uid).toBe('aud_1');
    expect(removeBellEventDraft([created], created.client_key)).toEqual([]);
  });

  it('copies a day by replacing target rows without copying backend ids', () => {
    const draft = baseDraft();
    draft.events.push({
      client_key: 'db-2',
      id: 2,
      weekday: '1',
      local_time: '10:00',
      label: 'Old Tuesday',
      audio_asset_uid: 'aud_2',
      active: true,
    });
    const copied = copyDayEvents(draft.events, '0', ['1', '2']);
    const tuesday = copied.filter((event) => event.weekday === '1');
    const wednesday = copied.filter((event) => event.weekday === '2');
    expect(tuesday).toHaveLength(1);
    expect(wednesday).toHaveLength(1);
    expect(tuesday[0].id).toBeNull();
    expect(wednesday[0].id).toBeNull();
    expect(tuesday[0].local_time).toBe('08:00');
  });

  it('rejects duplicate active times inside the same day', () => {
    const draft = baseDraft();
    draft.events.push({
      ...draft.events[0],
      client_key: 'new-2',
      id: null,
    });
    const result = validateBellScheduleDraft(draft);
    expect(result.valid).toBe(false);
    expect(result.days['0']).toBe('duplicate_time');
  });

  it('rejects an inverted date range', () => {
    const draft = baseDraft();
    draft.range_end = '2026-09-01';
    const result = validateBellScheduleDraft(draft);
    expect(result.valid).toBe(false);
    expect(result.form).toBe('range_order');
  });

  it('requires audio for rows sent to Odoo', () => {
    const draft = baseDraft();
    draft.events[0].audio_asset_uid = '';
    const result = validateBellScheduleDraft(draft);
    expect(result.rows['db-1']).toBe('audio_required');
  });

  it('keeps inactive historical Odoo events out of the operational editor', () => {
    const hydrated = hydrateBellScheduleDraft(
      {
        school: { id: 3, name: 'School', timezone: 'Africa/Casablanca' },
        schedule: {
          id: 4,
          name: 'Main',
          code: 'bell_default',
          active: true,
          events: [
            {
              id: 1,
              event_uid: 'bev_active',
              weekday: '0',
              local_time: '08:00',
              label: 'Start',
              active: true,
              priority: 50,
              late_tolerance_seconds: 30,
              audio_asset: { asset_uid: 'aud_1', name: 'Bell', version: '1' },
            },
            {
              id: 2,
              event_uid: 'bev_old',
              weekday: '0',
              local_time: '09:00',
              label: 'Old',
              active: false,
              priority: 50,
              late_tolerance_seconds: 30,
              audio_asset: { asset_uid: 'aud_1', name: 'Bell', version: '1' },
            },
          ],
        },
        active_version: null,
      },
      'Default',
      '2026-09-28',
      '2026-12-31',
    );

    expect(hydrated.events).toHaveLength(1);
    expect(hydrated.events[0].id).toBe(1);
  });

  it('maps only the Odoo PUT contract fields', () => {
    const payload = toBellSchedulePutInput(baseDraft());
    expect(payload).toEqual({
      schedule_id: 4,
      name: 'Main',
      range_start: '2026-09-28',
      range_end: '2026-12-31',
      events: [
        {
          id: 1,
          weekday: '0',
          local_time: '08:00',
          label: 'Start',
          audio_asset_uid: 'aud_1',
          active: true,
        },
      ],
    });
    expect(JSON.stringify(payload)).not.toContain('client_key');
  });
});
