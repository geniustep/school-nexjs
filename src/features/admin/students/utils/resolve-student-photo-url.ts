/** Map API-returned student photo paths to same-origin BFF routes. */
export function resolveStudentPhotoUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('/api/')) return trimmed;
  if (trimmed.startsWith('/')) return `/api/odoo${trimmed}`;
  const apiMatch = trimmed.match(/\/api\/v1(\/.*)$/);
  if (apiMatch) return `/api/odoo${apiMatch[1]}`;
  return null;
}
