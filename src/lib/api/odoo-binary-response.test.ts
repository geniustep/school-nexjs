import { describe, expect, it } from 'vitest';
import {
  isOdooBinaryResponse,
  isPdfArrayBuffer,
  isPdfContentType,
  PDF_MAGIC,
} from '@/lib/api/odoo-binary-response';

describe('odoo-binary-response', () => {
  it('detects application/pdf as binary even without attachment disposition', () => {
    expect(isOdooBinaryResponse('application/pdf', null)).toBe(true);
    expect(isOdooBinaryResponse('application/pdf; charset=binary', 'inline')).toBe(true);
  });

  it('does not treat JSON as binary', () => {
    expect(isOdooBinaryResponse('application/json', null)).toBe(false);
  });

  it('detects HTML login pages as non-PDF content type', () => {
    expect(isPdfContentType('text/html')).toBe(false);
    expect(isPdfContentType('application/pdf')).toBe(true);
  });

  it('validates PDF magic bytes', () => {
    const pdf = new TextEncoder().encode(`${PDF_MAGIC}1.4`).buffer;
    expect(isPdfArrayBuffer(pdf)).toBe(true);
    const html = new TextEncoder().encode('<!DOCTYPE html>').buffer;
    expect(isPdfArrayBuffer(html)).toBe(false);
  });
});
