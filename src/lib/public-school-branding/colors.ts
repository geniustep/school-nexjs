const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function expandShortHex(hex: string): string {
  const body = hex.slice(1);
  return `#${body[0]}${body[0]}${body[1]}${body[1]}${body[2]}${body[2]}`;
}

/** Accept #RGB / #RRGGBB only — safe for inline CSS variables. */
export function sanitizeCssHexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!HEX_COLOR.test(trimmed)) return null;
  return trimmed.length === 4 ? expandShortHex(trimmed) : trimmed;
}
