import type { SchoolClass } from '@/types/class';
import type { TimetableSlot } from '@/types/timetable';
import { WEEK_DAYS } from '../timetable-week';

export type FilterOption = { id: string; name: string };
export type WorkspaceFilters = { cycles: string[]; levels: string[]; classes: string[]; teachers: string[]; days: string[] };
const matches = (values: string[], id?: number | null) => !values.length || (id != null && values.includes(String(id)));
const unique = (rows: FilterOption[]) => [...new Map(rows.map((row) => [row.id, row])).values()].sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));

export function academicFilterOptions(classes: SchoolClass[], cycles: string[], levels: string[]) {
  const cycleClasses = classes.filter((c) => matches(cycles, c.level?.cycle?.id));
  return {
    cycles: unique(classes.flatMap((c) => c.level?.cycle ? [{id:String(c.level.cycle.id),name:c.level.cycle.name}] : [])),
    levels: unique(cycleClasses.flatMap((c) => c.level ? [{id:String(c.level.id),name:c.level.display_name || c.level.name}] : [])),
    classes: cycleClasses.filter((c) => matches(levels,c.level?.id)).map((c) => ({id:String(c.id),name:c.name})),
  };
}

/** OR inside a facet; AND between facets. Never infer academic links from names. */
export function filterWorkspaceSlots(slots: TimetableSlot[], classes: SchoolClass[], filters: WorkspaceFilters) {
  const byId = new Map(classes.map((c) => [c.id, c]));
  return slots.filter((slot) => {
    const c = slot.class ? byId.get(slot.class.id) : undefined;
    return matches(filters.cycles, c?.level?.cycle?.id) && matches(filters.levels, c?.level?.id)
      && matches(filters.classes, slot.class?.id) && matches(filters.teachers, slot.teacher?.id)
      && (!filters.days.length || filters.days.includes(slot.day ?? ''));
  });
}
export function sortWorkspaceSlots(slots: TimetableSlot[]) {
  const order = (day?: string | null) => { const index = WEEK_DAYS.indexOf(day ?? ''); return index < 0 ? 7 : index; };
  return [...slots].sort((a,b) => order(a.day)-order(b.day) || (a.start_time ?? '').localeCompare(b.start_time ?? '') || a.id-b.id);
}

/** School wall date for presentation only; this is NOT a dated session occurrence. */
export function schoolDay(now: Date, timezone: string): {day: string; date: string} | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone:timezone,weekday:'long',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    const day = value('weekday').toLowerCase();
    return WEEK_DAYS.includes(day) ? {day,date:`${value('year')}-${value('month')}-${value('day')}`} : null;
  } catch { return null; }
}
