// Timetable payloads — mirrors live API v1 timetable endpoints.

import type { Ref } from './api';

export interface TimetableSubject extends Ref {
  color?: string | null;
}

export interface TimetableSlot {
  id: number;
  day?: string | null;
  day_label?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  class?: Ref | null;
  subject?: TimetableSubject | null;
  teacher?: Ref | null;
  is_current?: boolean;
  is_next?: boolean;
}

export interface TodayTimetable {
  date?: string | null;
  day?: string | null;
  current_slot?: TimetableSlot | null;
  next_slot?: TimetableSlot | null;
  slots?: TimetableSlot[];
}

export interface WeekTimetable {
  week?: Record<string, TimetableSlot[]>;
}
