import type { AcademicClassOption, AcademicLevelOption } from '@/types/student-360';

export function studentLevelLabel(level: AcademicLevelOption | null | undefined): string {
  if (!level) return '—';
  const alias = level.display_alias?.trim();
  if (alias) return alias;
  const name = level.name?.trim();
  if (name) return name;
  const code = level.code?.trim();
  if (code) return code;
  return '—';
}

export function studentClassLabel(cls: AcademicClassOption | null | undefined): string {
  if (!cls) return '—';
  const display = cls.display_name?.trim();
  if (display) return display;
  const name = cls.name?.trim();
  if (name) return name;
  const code = cls.code?.trim();
  if (code) return code;
  return '—';
}

export function refOrStringLabel(value: { name?: string } | string | null | undefined): string {
  if (!value) return '—';
  if (typeof value === 'string') return value.trim() || '—';
  return value.name?.trim() || '—';
}
