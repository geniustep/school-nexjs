import type { Ref } from '@/types/api';
import type { FeePlan } from '@/types/finance';

export interface AcademicYearOption {
  id: number;
  name: string;
}

function yearLabel(id: number, name?: string | null): string {
  return name?.trim() || String(id);
}

/** Extract `{ id, name }` from class/finance payloads that expose academic year refs. */
export function academicYearFromSource(source?: {
  academic_year_id?: number;
  academic_year?: Ref | string | { id: number; name: string } | null;
  academic_year_name?: string | null;
} | null): AcademicYearOption | null {
  if (!source) return null;
  const explicitName = source.academic_year_name?.trim();
  if (source.academic_year_id) {
    const ay = source.academic_year;
    const name =
      explicitName ||
      (typeof ay === 'string'
        ? ay
        : ay && typeof ay === 'object' && 'name' in ay
          ? ay.name
          : undefined);
    return { id: source.academic_year_id, name: yearLabel(source.academic_year_id, name) };
  }
  const ay = source.academic_year;
  if (ay && typeof ay === 'object' && 'id' in ay) {
    return { id: ay.id, name: yearLabel(ay.id, ay.name) };
  }
  return null;
}

/** Merge academic years from fee plans and optional class/student context. */
export function mergeAcademicYearOptions(
  ...groups: (AcademicYearOption | null | undefined)[]
): AcademicYearOption[] {
  const map = new Map<number, AcademicYearOption>();
  for (const opt of groups) {
    if (!opt) continue;
    const existing = map.get(opt.id);
    if (!existing || existing.name === String(opt.id)) {
      map.set(opt.id, opt);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function academicYearsFromFeePlans(plans: FeePlan[] | null | undefined): AcademicYearOption[] {
  if (!plans?.length) return [];
  return mergeAcademicYearOptions(...plans.map((p) => academicYearFromSource(p)));
}

function isIdFallbackLabel(id: number, name: string): boolean {
  return name === String(id);
}

/** Resolve display name; falls back to lookup options when API only returns `academic_year_id`. */
export function resolveAcademicYearName(
  source?: Parameters<typeof academicYearFromSource>[0],
  options?: Pick<AcademicYearOption, 'id' | 'name'>[] | null,
): string | null {
  const parsed = academicYearFromSource(source);
  if (!parsed) return null;

  const { id, name } = parsed;
  if (!isIdFallbackLabel(id, name)) return name;

  const match = options?.find((o) => o.id === id);
  if (match?.name?.trim()) return match.name.trim();

  return null;
}
