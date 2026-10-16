import type { EligibleTeachersPickerValue } from '@/features/admin/teachers/components/eligible-teachers-picker';

/** Preserve ordinary teacher selection, but never carry an override to a new date window. */
export function keepTeacherWhenDatesChange(
  current: EligibleTeachersPickerValue,
): EligibleTeachersPickerValue {
  return {
    teacherId: current.override ? null : current.teacherId,
    override: false,
    overrideReason: '',
  };
}
