export type RegulatoryCalendarState =
  | 'not_created'
  | 'draft'
  | 'under_review'
  | 'published'
  | 'archived'
  | 'other';

export function regulatoryCalendarState(
  calendarId: number | null | undefined,
  state: string | null | undefined,
): RegulatoryCalendarState {
  if (!calendarId) return 'not_created';

  switch ((state ?? 'draft').toLocaleLowerCase()) {
    case 'draft':
      return 'draft';
    case 'under_review':
      return 'under_review';
    case 'published':
      return 'published';
    case 'archived':
      return 'archived';
    default:
      return 'other';
  }
}
