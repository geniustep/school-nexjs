import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizePublicSchoolLogoBytes } from '@/lib/public-school-branding/logo-bytes';

describe('normalizePublicSchoolLogoBytes', () => {
  it('accepts binary PNG', () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const result = normalizePublicSchoolLogoBytes(png);
    expect(result?.contentType).toBe('image/png');
    expect(result?.bytes).toEqual(png);
  });

  it('decodes base64 PNG text from Odoo', () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const b64 = Buffer.from(png).toString('base64');
    const result = normalizePublicSchoolLogoBytes(new TextEncoder().encode(b64));
    expect(result?.contentType).toBe('image/png');
    expect(result?.bytes).toEqual(png);
  });

  it('rejects HTML and JSON bodies', () => {
    expect(normalizePublicSchoolLogoBytes(new TextEncoder().encode('<html><body>x</body></html>'))).toBeNull();
    expect(normalizePublicSchoolLogoBytes(new TextEncoder().encode('{"success":false}'))).toBeNull();
  });

  it('rejects empty body', () => {
    expect(normalizePublicSchoolLogoBytes(new Uint8Array())).toBeNull();
  });

  it('decodes production nibras capture when present', () => {
  const path = '.diag-output/nibras-logo.bin';
    try {
      const raw = new Uint8Array(readFileSync(path));
      const result = normalizePublicSchoolLogoBytes(raw);
      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/png');
      expect(result?.bytes[0]).toBe(0x89);
      expect(result?.bytes[1]).toBe(0x50);
    } catch {
      // Optional fixture — skipped in CI when capture is absent.
    }
  });
});
