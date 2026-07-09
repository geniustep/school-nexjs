/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { describe, expect, it } from 'vitest';
import {
  ADMIN_HUB_CARD_CLASS,
  ADMIN_HUB_GRID_CLASS,
  academicHubLinkDescKey,
  hasAdminHubLinks,
} from '@/features/admin/hubs/academic-hub-present';

describe('academic-hub-present', () => {
  it('keeps shared hub card class names stable', () => {
    expect(ADMIN_HUB_GRID_CLASS).toBe('settings-hub-grid');
    expect(ADMIN_HUB_CARD_CLASS).toBe('settings-hub-card');
  });

  it('maps academic hub routes to existing list subtitle keys', () => {
    expect(academicHubLinkDescKey('/admin/homeworks')).toBe('admin.homeworkListDesc');
    expect(academicHubLinkDescKey('/admin/timetable')).toBe('admin.timetableDesc');
    expect(academicHubLinkDescKey('/admin/exam-results')).toBe('admin.examResultsListDesc');
    expect(academicHubLinkDescKey('/admin/unknown')).toBe('admin.academicCenterDesc');
  });

  it('detects empty hub visibility', () => {
    expect(hasAdminHubLinks(0)).toBe(false);
    expect(hasAdminHubLinks(2)).toBe(true);
  });
});
