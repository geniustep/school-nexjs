import type { Level, SchoolClass } from '@/types/class';
import type { CollectionReportsFilters } from '@/features/admin/finance/utils/collection-reports-present';

export type CollectionReportsDatePreset =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'custom';

type DateUpdate = Pick<CollectionReportsFilters, 'dateMode' | 'date' | 'dateFrom' | 'dateTo'>;

function isoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localStartOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfCurrentWeek(now: Date): Date {
  const day = localStartOfDay(now);
  const jsDay = day.getDay();
  const daysSinceMonday = jsDay === 0 ? 6 : jsDay - 1;
  day.setDate(day.getDate() - daysSinceMonday);
  return day;
}

export function collectionReportsPresetUpdates(
  preset: Exclude<CollectionReportsDatePreset, 'custom'>,
  now = new Date(),
): DateUpdate {
  const today = localStartOfDay(now);
  const todayIso = isoDate(today);

  if (preset === 'today') {
    return { dateMode: 'day', date: todayIso, dateFrom: '', dateTo: '' };
  }

  if (preset === 'yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { dateMode: 'day', date: isoDate(yesterday), dateFrom: '', dateTo: '' };
  }

  if (preset === 'week') {
    return {
      dateMode: 'range',
      date: '',
      dateFrom: isoDate(startOfCurrentWeek(today)),
      dateTo: todayIso,
    };
  }

  return {
    dateMode: 'range',
    date: '',
    dateFrom: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    dateTo: todayIso,
  };
}

export function resolveCollectionReportsDatePreset(
  filters: Pick<CollectionReportsFilters, 'dateMode' | 'date' | 'dateFrom' | 'dateTo'>,
  now = new Date(),
): CollectionReportsDatePreset {
  const today = collectionReportsPresetUpdates('today', now);
  const yesterday = collectionReportsPresetUpdates('yesterday', now);
  const week = collectionReportsPresetUpdates('week', now);
  const month = collectionReportsPresetUpdates('month', now);

  if (filters.dateMode === 'day' && filters.date === today.date) return 'today';
  if (filters.dateMode === 'day' && filters.date === yesterday.date) return 'yesterday';
  if (
    filters.dateMode === 'range' &&
    filters.dateFrom === week.dateFrom &&
    filters.dateTo === week.dateTo
  ) {
    return 'week';
  }
  if (
    filters.dateMode === 'range' &&
    filters.dateFrom === month.dateFrom &&
    filters.dateTo === month.dateTo
  ) {
    return 'month';
  }
  return 'custom';
}

export function collectionReportsRangeIsInverted(dateFrom: string, dateTo: string): boolean {
  return Boolean(dateFrom.trim() && dateTo.trim() && dateFrom.trim() > dateTo.trim());
}

export function filterCollectionReportLevels(levels: Level[], cycle: string): Level[] {
  if (!cycle.trim()) return levels;
  return levels.filter((level) => level.cycle?.code === cycle);
}

export function filterCollectionReportClasses(
  classes: SchoolClass[],
  input: { cycle: string; levelId: string },
): SchoolClass[] {
  const levelId = input.levelId.trim() ? Number(input.levelId) : null;
  return classes.filter((klass) => {
    if (levelId != null && Number.isFinite(levelId)) {
      return klass.level?.id === levelId;
    }
    if (input.cycle.trim()) {
      return klass.level?.cycle?.code === input.cycle;
    }
    return true;
  });
}
