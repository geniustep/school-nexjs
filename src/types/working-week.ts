export type WorkingWeekDayMode = 'full' | 'morning_only' | 'afternoon_only' | 'closed';
export type WorkingWeekday = 'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday';

export interface WorkingWeekDay {
 day_of_week: WorkingWeekday;
 is_study_day: boolean;
 day_mode: WorkingWeekDayMode;
 sequence: number;
 record_id: number | null;
 configured: boolean;
}
export interface WorkingWeek {
 school_id: number;
 academic_year: {id:number;name:string;code?:string|null;date_start?:string|null;date_end?:string|null};
 days: WorkingWeekDay[];
 configured: boolean;
 reliable: boolean;
 weekday_order: WorkingWeekday[];
}
