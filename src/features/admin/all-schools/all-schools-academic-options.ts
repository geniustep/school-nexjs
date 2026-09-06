import type { Level, LevelCycle, SchoolClass } from '@/types/class';

function normalized(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function levelIdentity(level: Pick<Level, 'academic_code' | 'code' | 'display_name' | 'name'>): string[] {
  return [level.academic_code, level.code, level.display_name, level.name]
    .map(normalized)
    .filter(Boolean);
}

function usableEmbeddedCycle(level: SchoolClass['level']): LevelCycle | null {
  const cycle = level?.cycle;
  if (!cycle || typeof cycle.id !== 'number' || typeof cycle.name !== 'string') return null;
  return cycle;
}

/**
 * All-Schools class rows carry each concrete school-level id, while the canonical
 * levels endpoint remains active-school scoped. Borrow the academic/cycle metadata
 * from an equivalent reference level without replacing the concrete id used by
 * filters and class rows. Unknown custom levels remain valid orphan groups.
 */
export function mergeAllSchoolsClassLevels(
  classes: SchoolClass[],
  referenceLevels: Level[],
): Level[] {
  const byId = new Map<number, Level>(referenceLevels.map((level) => [level.id, level]));
  const referenceByIdentity = new Map<string, Level>();

  for (const level of referenceLevels) {
    for (const key of levelIdentity(level)) {
      if (!referenceByIdentity.has(key)) referenceByIdentity.set(key, level);
    }
  }

  for (const cls of classes) {
    const rowLevel = cls.level;
    if (!rowLevel || byId.has(rowLevel.id)) continue;

    const match = [
      rowLevel.academic_code,
      rowLevel.code,
      rowLevel.display_name,
      rowLevel.name,
    ]
      .map(normalized)
      .filter(Boolean)
      .map((key) => referenceByIdentity.get(key))
      .find((level): level is Level => level != null);

    byId.set(rowLevel.id, {
      ...(match ?? {}),
      id: rowLevel.id,
      name: rowLevel.name,
      code: rowLevel.code ?? match?.code ?? null,
      display_name: rowLevel.display_name ?? match?.display_name ?? null,
      display_alias: rowLevel.display_alias ?? match?.display_alias ?? null,
      academic_code: rowLevel.academic_code ?? match?.academic_code ?? null,
      moroccan_display_alias:
        rowLevel.moroccan_display_alias ?? match?.moroccan_display_alias ?? null,
      cycle: usableEmbeddedCycle(rowLevel) ?? match?.cycle ?? null,
    });
  }

  return [...byId.values()];
}
