import type { AcademicCalendarWarning } from '@/types/academic-calendar';

export type AcademicCalendarWarningLevel = 'info' | 'warning' | 'blocker';
export type AcademicCalendarWarningKind = 'overlap' | 'outside_operational_range' | 'generic';

export interface AcademicCalendarWarningReviewItem {
  warning: AcademicCalendarWarning;
  level: AcademicCalendarWarningLevel;
  kind: AcademicCalendarWarningKind;
  count: number;
}

function warningSearchText(warning: AcademicCalendarWarning): string {
  return `${warning.code ?? ''} ${warning.message ?? ''}`
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .toLocaleLowerCase();
}

export function academicCalendarWarningKind(
  warning: AcademicCalendarWarning,
): AcademicCalendarWarningKind {
  const text = warningSearchText(warning);

  if (/\b(overlap|overlapping|collision|intersect)\b|تداخل/.test(text)) {
    return 'overlap';
  }

  if (
    /(outside|beyond|after).*(academic|school).*(year|range)|outside.*year|after.*year|date.*range|خارج.*(السنة|النطاق)|بعد.*نهاية.*السنة/.test(
      text,
    )
  ) {
    return 'outside_operational_range';
  }

  return 'generic';
}

export function academicCalendarWarningLevel(
  warning: AcademicCalendarWarning,
): AcademicCalendarWarningLevel {
  const severity = warning.severity?.toLocaleLowerCase();
  if (severity === 'error') return 'blocker';

  const kind = academicCalendarWarningKind(warning);
  if (kind === 'outside_operational_range') return 'info';
  if (severity === 'info') return 'info';

  return 'warning';
}

export function groupAcademicCalendarWarnings(
  warnings: AcademicCalendarWarning[] | null | undefined,
): AcademicCalendarWarningReviewItem[] {
  const grouped = new Map<string, AcademicCalendarWarningReviewItem>();

  for (const warning of warnings ?? []) {
    const level = academicCalendarWarningLevel(warning);
    const kind = academicCalendarWarningKind(warning);
    const key = [
      level,
      kind,
      warning.code?.trim().toLocaleLowerCase() ?? '',
      warning.message.trim().toLocaleLowerCase(),
    ].join('|');
    const current = grouped.get(key);

    if (current) {
      current.count += 1;
      continue;
    }

    grouped.set(key, { warning, level, kind, count: 1 });
  }

  return [...grouped.values()];
}
