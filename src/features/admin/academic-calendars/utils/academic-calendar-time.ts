/**
 * School calendar event clock helpers.
 * Backend stores day times as float hours (8.5 = 08:30, 13.25 = 13:15).
 */

export function academicCalendarFloatHoursToClock(value: number): string | null {
  if (!Number.isFinite(value) || value < 0 || value >= 24) return null;
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  if (minutes === 60) {
    const next = hours + 1;
    if (next >= 24) return null;
    return `${String(next).padStart(2, '0')}:00`;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function academicCalendarClockToFloatHours(value: string): number | null {
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours + minutes / 60;
}

/** Normalize API time (float hours or HH:MM) to display HH:MM. */
export function normalizeAcademicCalendarTimeValue(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return academicCalendarFloatHoursToClock(raw);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      const asFloat = academicCalendarClockToFloatHours(trimmed);
      return asFloat == null ? null : academicCalendarFloatHoursToClock(asFloat);
    }
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) return academicCalendarFloatHoursToClock(asNumber);
  }
  return null;
}

/** Convert display HH:MM to backend float hours for mutation payloads. */
export function academicCalendarTimeToPayload(value: string | null | undefined): number | undefined {
  if (value == null || !value.trim()) return undefined;
  return academicCalendarClockToFloatHours(value) ?? undefined;
}
