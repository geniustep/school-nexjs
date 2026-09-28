import type {
  BellEventDraft,
  BellScheduleDraft,
  BellScheduleValidation,
  BellValidationCode,
  EdgeBellScheduleData,
  EdgeBellSchedulePutInput,
  EdgeWeekday,
} from '@/features/admin/edge/types';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
let localSequence = 0;

function clientKey(prefix: string): string {
  localSequence += 1;
  return `${prefix}-${Date.now()}-${localSequence}`;
}

export function createBellEventDraft(
  weekday: EdgeWeekday,
  audioAssetUid = '',
): BellEventDraft {
  return {
    client_key: clientKey('new'),
    id: null,
    weekday,
    local_time: '',
    label: '',
    audio_asset_uid: audioAssetUid,
    active: true,
  };
}

export function removeBellEventDraft(
  events: BellEventDraft[],
  clientKeyToRemove: string,
): BellEventDraft[] {
  return events.filter((event) => event.client_key !== clientKeyToRemove);
}

export function copyDayEvents(
  events: BellEventDraft[],
  sourceDay: EdgeWeekday,
  targetDays: EdgeWeekday[],
): BellEventDraft[] {
  const targets = new Set(targetDays.filter((day) => day !== sourceDay));
  if (!targets.size) return events;

  const sourceEvents = events.filter((event) => event.weekday === sourceDay);
  const preserved = events.filter((event) => !targets.has(event.weekday));

  const copies = [...targets].flatMap((weekday) =>
    sourceEvents.map((event) => ({
      ...event,
      client_key: clientKey('copy'),
      id: null,
      weekday,
    })),
  );

  return [...preserved, ...copies];
}

export function hydrateBellScheduleDraft(
  data: EdgeBellScheduleData,
  defaultName: string,
  rangeStart: string,
  rangeEnd: string,
): BellScheduleDraft {
  const schedule = data.schedule;
  const versionMatchesSchedule =
    !!schedule && data.active_version?.schedule_id === schedule.id;

  return {
    schedule_id: schedule?.id ?? null,
    name: schedule?.name?.trim() || defaultName,
    range_start: versionMatchesSchedule
      ? data.active_version?.valid_from.slice(0, 10) || rangeStart
      : rangeStart,
    range_end: versionMatchesSchedule
      ? data.active_version?.valid_until.slice(0, 10) || rangeEnd
      : rangeEnd,
    events:
      schedule?.events
        .filter((event) => event.active)
        .map((event) => ({
          client_key: `db-${event.id}`,
          id: event.id,
          weekday: event.weekday,
          local_time: event.local_time,
          label: event.label,
          audio_asset_uid: event.audio_asset.asset_uid,
          active: true,
        })) ?? [],
  };
}

export function validateBellScheduleDraft(
  draft: BellScheduleDraft,
): BellScheduleValidation {
  const rows: Record<string, BellValidationCode> = {};
  const days: BellScheduleValidation['days'] = {};

  if (!draft.name.trim()) {
    return { valid: false, form: 'name_required', rows, days };
  }
  if (!DATE_RE.test(draft.range_start) || !DATE_RE.test(draft.range_end)) {
    return { valid: false, form: 'range_required', rows, days };
  }
  if (draft.range_end < draft.range_start) {
    return { valid: false, form: 'range_order', rows, days };
  }

  const seen = new Map<EdgeWeekday, Set<string>>();
  for (const event of draft.events) {
    if (!event.local_time) {
      rows[event.client_key] = 'time_required';
      continue;
    }
    if (!TIME_RE.test(event.local_time)) {
      rows[event.client_key] = 'time_invalid';
      continue;
    }
    if (!event.audio_asset_uid) {
      rows[event.client_key] = 'audio_required';
      continue;
    }

    if (!event.active) continue;
    const daySeen = seen.get(event.weekday) ?? new Set<string>();
    if (daySeen.has(event.local_time)) {
      days[event.weekday] = 'duplicate_time';
    }
    daySeen.add(event.local_time);
    seen.set(event.weekday, daySeen);
  }

  return {
    valid: Object.keys(rows).length === 0 && Object.keys(days).length === 0,
    rows,
    days,
  };
}

export function toBellSchedulePutInput(
  draft: BellScheduleDraft,
): EdgeBellSchedulePutInput {
  return {
    schedule_id: draft.schedule_id,
    name: draft.name.trim(),
    range_start: draft.range_start,
    range_end: draft.range_end,
    events: draft.events.map((event) => ({
      id: event.id,
      weekday: event.weekday,
      local_time: event.local_time,
      label: event.label.trim(),
      audio_asset_uid: event.audio_asset_uid,
      active: event.active,
    })),
  };
}
