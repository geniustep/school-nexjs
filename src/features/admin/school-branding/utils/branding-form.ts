import { SCHOOL_BRANDING_HEX_COLOR } from '@/features/admin/school-branding/constants';

export function isValidSchoolBrandingHexColor(value: string): boolean {
  return SCHOOL_BRANDING_HEX_COLOR.test(value.trim());
}

export function normalizeSchoolBrandingHexColor(value: string): string {
  return value.trim().toUpperCase();
}

export async function readFileAsBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
