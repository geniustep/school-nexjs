export type NormalizedSchoolLogo = {
  bytes: Uint8Array;
  contentType: string;
};

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

function isBinaryImage(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return true;
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return true;
  if (startsWith(bytes, [0x47, 0x49, 0x46])) return true;
  if (bytes.length >= 12 && startsWith(bytes, [0x52, 0x49, 0x46, 0x46])) {
    const tag = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
    return tag === 'WEBP';
  }
  return false;
}

function detectImageContentType(bytes: Uint8Array): string {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x47, 0x49, 0x46])) return 'image/gif';
  if (bytes.length >= 12 && String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!) === 'WEBP') {
    return 'image/webp';
  }
  return 'application/octet-stream';
}

function looksLikeHtmlOrJson(bytes: Uint8Array): boolean {
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 48)).trimStart().toLowerCase();
  return (
    head.startsWith('<!doctype') ||
    head.startsWith('<html') ||
    head.startsWith('<?xml') ||
    head.startsWith('{') ||
    head.startsWith('[')
  );
}

function isBase64Char(byte: number): boolean {
  return (
    (byte >= 0x41 && byte <= 0x5a) ||
    (byte >= 0x61 && byte <= 0x7a) ||
    (byte >= 0x30 && byte <= 0x39) ||
    byte === 0x2b ||
    byte === 0x2f ||
    byte === 0x3d ||
    byte === 0x0a ||
    byte === 0x0d ||
    byte === 0x09
  );
}

function looksLikeBase64Text(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (!isBase64Char(bytes[i]!)) return false;
  }
  return true;
}

function looksLikeBase64ImageText(bytes: Uint8Array): boolean {
  if (!looksLikeBase64Text(bytes)) return false;
  const text = new TextDecoder('utf-8').decode(bytes).replace(/\s/g, '');
  return text.startsWith('iVBOR') || text.startsWith('/9j/') || text.startsWith('R0lGOD') || text.startsWith('UklGR');
}

function decodeBase64Image(bytes: Uint8Array): Uint8Array | null {
  const text = new TextDecoder('utf-8').decode(bytes).replace(/\s/g, '');
  try {
    const decoded = Uint8Array.from(Buffer.from(text, 'base64'));
    return decoded.length > 0 && isBinaryImage(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * Normalize upstream logo bytes from Odoo.
 * Rejects HTML/JSON/empty bodies; decodes base64-wrapped PNG/JPEG when Odoo returns text.
 */
export function normalizePublicSchoolLogoBytes(raw: Uint8Array): NormalizedSchoolLogo | null {
  if (raw.length === 0) return null;
  if (looksLikeHtmlOrJson(raw)) return null;

  if (isBinaryImage(raw)) {
    return { bytes: raw, contentType: detectImageContentType(raw) };
  }

  if (looksLikeBase64ImageText(raw) || looksLikeBase64Text(raw)) {
    const decoded = decodeBase64Image(raw);
    if (decoded) {
      return { bytes: decoded, contentType: detectImageContentType(decoded) };
    }
  }

  return null;
}
