export type TimetableSetupContext = {
  school_id: number;
  academic_year_id: number;
  setup_complete: boolean;
  allowed_weekdays: string[];
  periods: unknown[];
  blockers: {open_draft: string[]; save_line: string[]; publish: string[]};
  completeness: {config_present:boolean; study_days_count:number; study_days_reliable:boolean; lesson_period_count:number};
};
export function timetableSetupReady(context: TimetableSetupContext | null): boolean {
  return context?.setup_complete === true;
}
export function timetableSetupMessage(context: TimetableSetupContext | null, unavailable: boolean): string {
  if (unavailable) return 'تعذّر التحقق من إعداد استعمال الزمان. قد يكون عقد الجاهزية غير منشور بعد؛ أُوقفت عمليات التحرير مؤقتًا.';
  if (!context) return 'جارٍ التحقق من جاهزية إعداد استعمال الزمان...';
  if (!context.setup_complete) return 'لم يكتمل إعداد استعمال الزمان لهذه السنة الدراسية. يجب تحديد الأيام الدراسية والفترات من إعدادات المدرسة قبل إضافة الحصص أو نشرها.';
  return 'إعداد استعمال الزمان جاهز.';
}
export function allowedTimetableDays(context: TimetableSetupContext | null): string[] {
  if (!timetableSetupReady(context)) return [];
  return Array.isArray(context?.allowed_weekdays) ? context.allowed_weekdays : [];
}
