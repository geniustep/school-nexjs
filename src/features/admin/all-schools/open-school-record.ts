export interface OpenSchoolRecordOptions {
  schoolId: number | null | undefined;
  activeSchoolId: number | null | undefined;
  switchSchool: (schoolId: number) => Promise<boolean>;
  navigate: () => void;
}

export type OpenSchoolRecordResult = 'opened' | 'invalid_school' | 'switch_failed';

export async function switchSchoolThenOpen({
  schoolId,
  activeSchoolId,
  switchSchool,
  navigate,
}: OpenSchoolRecordOptions): Promise<OpenSchoolRecordResult> {
  if (!Number.isFinite(schoolId) || !schoolId || schoolId <= 0) {
    return 'invalid_school';
  }

  if (activeSchoolId !== schoolId) {
    const switched = await switchSchool(schoolId);
    if (!switched) return 'switch_failed';
  }

  navigate();
  return 'opened';
}
