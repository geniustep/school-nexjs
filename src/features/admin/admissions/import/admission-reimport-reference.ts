import type { AdmissionOptions } from '@/types/admission';
import type { AdmissionReimportReferenceLookup } from './admission-reimport-types';

function addKeys(map: Map<string, number>, id: number, ...keys: Array<string | undefined | null>) {
  for (const key of keys) {
    const text = key?.trim();
    if (!text) continue;
    map.set(text.toLowerCase(), id);
  }
}

export function buildAdmissionReimportReferenceLookup(
  options: AdmissionOptions | null | undefined,
): AdmissionReimportReferenceLookup {
  const academicYears = new Map<string, number>();
  const sources = new Map<string, number>();
  const levels = new Map<string, number>();

  for (const year of options?.academic_years ?? []) {
    addKeys(academicYears, year.id, year.code, year.name, String(year.id));
  }

  for (const source of options?.sources ?? []) {
    const id = typeof source.id === 'number' ? source.id : Number(source.value);
    if (!Number.isFinite(id) || id <= 0) continue;
    addKeys(sources, id, source.code, source.label, String(id));
  }

  for (const level of options?.levels ?? []) {
    addKeys(levels, level.id, level.code, level.name, String(level.id));
  }

  return { academicYears, sources, levels };
}
