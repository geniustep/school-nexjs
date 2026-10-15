/** The bulk endpoint may return HTTP 200 with per-line validation errors. */
export type BulkSaveError = {
  index?: number | null;
  line_id?: number | null;
  code?: string;
  message: string;
};

export function validTimetableLineIds(ids: readonly (number | null | undefined)[]): number[] {
  return [...new Set(ids.filter((id): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0))];
}

/** Server index identifies new/changed lines, while line_id identifies saved lines. */
export function errorForTimetableLine(
  errors: readonly BulkSaveError[],
  index: number,
  lineId?: number,
): BulkSaveError | undefined {
  return errors.find(error => error.index === index)
    ?? (lineId ? errors.find(error => error.line_id === lineId) : undefined);
}

export function rejectedTimetableIndexes(errors: readonly BulkSaveError[]): Set<number> {
  return new Set(errors.flatMap(error => typeof error.index === 'number' && Number.isSafeInteger(error.index) && error.index >= 0 ? [error.index] : []));
}

export function failedTimetableDeletionIds(errors: readonly BulkSaveError[]): number[] {
  return validTimetableLineIds(errors
    .filter(error => error.index == null)
    .map(error => error.line_id));
}

export function timetableBulkSaveNotice(errors: readonly BulkSaveError[], savedCount: number): string {
  if (!errors.length) return 'تم حفظ المسودة';
  const detail = errors[0]?.message ?? 'راجع أخطاء الحصص';
  return savedCount > 0
    ? `حُفظت بعض الحصص، وتعذر حفظ البقية: ${detail}`
    : `لم تُحفظ التعديلات: ${detail}`;
}
