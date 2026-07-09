/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

/** Shared hub navigation card classes (Settings + Academic). */
export const ADMIN_HUB_GRID_CLASS = 'settings-hub-grid';
export const ADMIN_HUB_CARD_CLASS = 'settings-hub-card';
export const ADMIN_HUB_CARD_ICON_CLASS = 'settings-hub-card__icon';

/** Reuse existing list subtitles — no new copy contract. */
const ACADEMIC_HUB_DESC_BY_HREF: Readonly<Record<string, string>> = {
  '/admin/homeworks': 'admin.homeworkListDesc',
  '/admin/resources': 'admin.resourcesListDesc',
  '/admin/timetable': 'admin.timetableDesc',
  '/admin/exams': 'admin.examsListDesc',
  '/admin/exam-results': 'admin.examResultsListDesc',
  '/admin/classes': 'admin.classesListDesc',
  '/admin/levels': 'admin.levelsListDesc',
  '/admin/subjects': 'admin.subjectsListDesc',
};

export function academicHubLinkDescKey(href: string): string {
  return ACADEMIC_HUB_DESC_BY_HREF[href] ?? 'admin.academicCenterDesc';
}

export function hasAdminHubLinks(count: number): boolean {
  return count > 0;
}
