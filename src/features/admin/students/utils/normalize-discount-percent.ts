/** Max distance from an integer before we keep fractional percent (e.g. 39.98 → 40). */
const NEAR_INTEGER_TOLERANCE = 0.021;

export function normalizeDiscountPercentInput(
  value: string | number | null | undefined,
): number | null {
  if (value == null) return null;

  const raw = typeof value === 'number' ? value : value.trim();
  if (raw === '') return null;

  const parsed = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;

  const clamped = Math.min(100, Math.max(0, parsed));
  const nearestInt = Math.round(clamped);
  if (Math.abs(clamped - nearestInt) <= NEAR_INTEGER_TOLERANCE) {
    return nearestInt;
  }

  return Math.round(clamped * 100) / 100;
}

export function formatDiscountPercentDisplay(value: string | number | null | undefined): string {
  const normalized = normalizeDiscountPercentInput(value);
  if (normalized == null) return typeof value === 'string' ? value.trim() : '';
  if (Number.isInteger(normalized)) return String(normalized);
  return String(normalized);
}

export function parseDiscountPayloadValue(
  type: 'percent' | 'fixed_amount' | '' | string,
  raw: string,
): number | null | undefined {
  if (type === 'percent') {
    const normalized = normalizeDiscountPercentInput(raw);
    return normalized != null ? normalized : undefined;
  }

  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}
