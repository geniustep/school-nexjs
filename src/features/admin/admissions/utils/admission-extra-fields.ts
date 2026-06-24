export function parseExtraFieldBool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function extraFieldText(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

export function hasAnyExtraFieldText(...values: Array<string | null | undefined>): boolean {
  return values.some((v) => extraFieldText(v).length > 0);
}
