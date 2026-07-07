import type { Student } from '@/types/student';
import type { AcademicClassOption, AcademicLevelOption } from '@/types/student-360';

function asClassOption(cls: Student['class']): AcademicClassOption | null {
  if (!cls) return null;
  return cls as AcademicClassOption;
}

function asLevelOption(level: Student['level']): AcademicLevelOption | null {
  if (!level) return null;
  return level as AcademicLevelOption;
}

function compactAcademicLabel(parts: {
  display_alias?: string | null;
  code?: string | null;
  display_name?: string | null;
  name?: string | null;
}): string | null {
  const alias = parts.display_alias?.trim();
  if (alias) return alias;

  const code = parts.code?.trim();
  if (code) return code;

  const display = parts.display_name?.trim();
  if (display) {
    const short = display.split(/\s*[—–·|]\s*/)[0]?.trim();
    if (short) return short;
  }

  const name = parts.name?.trim();
  if (!name) return null;

  const short = name.split(/\s*[—–·|]\s*/)[0]?.trim();
  return short || name;
}

/** Compact class label for Kanban (e.g. `P1A`, `6e`, `CM1`). */
export function studentKanbanClassShortLabel(cls: Student['class']): string | null {
  const option = asClassOption(cls);
  if (!option) return null;
  return compactAcademicLabel(option);
}

/** Compact level label for Kanban top row (e.g. `P1`, `6e`, `2BAC`). */
export function studentKanbanLevelShortLabel(level: Student['level']): string | null {
  const option = asLevelOption(level);
  if (!option) return null;
  const code = option.code?.trim();
  if (code) return code;
  return compactAcademicLabel(option);
}
