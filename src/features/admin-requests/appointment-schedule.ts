const DATETIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Add minutes to a datetime-local wall-clock value without timezone conversion. */
export function appointmentDefaultEnd(start: string, minutes = 30): string {
  const match = DATETIME_LOCAL_PATTERN.exec(start);
  if (!match) return '';

  const [, year, month, day, hour, minute] = match;
  const value = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  ));
  value.setUTCMinutes(value.getUTCMinutes() + minutes);

  return [
    value.getUTCFullYear(),
    '-',
    pad(value.getUTCMonth() + 1),
    '-',
    pad(value.getUTCDate()),
    'T',
    pad(value.getUTCHours()),
    ':',
    pad(value.getUTCMinutes()),
  ].join('');
}
