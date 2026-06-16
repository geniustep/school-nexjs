/** Detect Odoo binary exports (PDF, CSV, attachments) that must not be parsed as JSON. */
export function isOdooBinaryResponse(
  contentType: string | null | undefined,
  contentDisposition: string | null | undefined,
): boolean {
  const ct = contentType?.toLowerCase() ?? '';
  const cd = contentDisposition?.toLowerCase() ?? '';
  if (cd.includes('attachment')) return true;
  if (cd.includes('inline') && ct.includes('application/pdf')) return true;
  if (ct.includes('application/pdf')) return true;
  if (ct.includes('text/csv')) return true;
  if (ct.includes('application/csv')) return true;
  if (ct.includes('application/octet-stream')) return true;
  return false;
}

export const PDF_MAGIC = '%PDF-';

export function isPdfContentType(contentType: string | null | undefined): boolean {
  return (contentType?.toLowerCase() ?? '').includes('application/pdf');
}

export function isPdfArrayBuffer(buffer: ArrayBufferLike): boolean {
  if (buffer.byteLength < 5) return false;
  const bytes = new Uint8Array(buffer, 0, 5);
  const head = String.fromCharCode(...bytes);
  return head === PDF_MAGIC;
}
