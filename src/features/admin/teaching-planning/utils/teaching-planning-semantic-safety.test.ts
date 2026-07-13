import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  TEACHING_PLANNING_COMING_SOON_CARDS,
  TEACHING_PLANNING_HUB_CARDS,
  TEACHING_PLANNING_IMPLEMENTED_HREFS,
  teachingPlanningComingSoonHasLiveRoute,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';

describe('teaching planning semantic safety', () => {
  it('keeps Teaching Offering routes distinct from teaching-assignments workflow', () => {
    expect(TEACHING_PLANNING_IMPLEMENTED_HREFS).toContain('/admin/teaching-planning/offerings');
    expect(TEACHING_PLANNING_IMPLEMENTED_HREFS).not.toContain(
      '/admin/settings/academic-setup/assignments',
    );
  });

  it('implements Annual Distribution and Didactic Sequence routes', () => {
    expect(TEACHING_PLANNING_IMPLEMENTED_HREFS).toContain(
      '/admin/teaching-planning/distributions',
    );
    expect(TEACHING_PLANNING_IMPLEMENTED_HREFS).toContain('/admin/teaching-planning/sequences');
    const hubHrefs = TEACHING_PLANNING_HUB_CARDS.map((card) => card.href);
    expect(hubHrefs).toContain('/admin/teaching-planning/distributions');
    expect(hubHrefs).toContain('/admin/teaching-planning/sequences');
  });

  it('has no coming-soon cards left and exposes live jathatha, delivery, journal and progress routes', () => {
    // Actual Delivery Review, Class Journal, and Teaching Progress are now implemented.
    expect(teachingPlanningComingSoonHasLiveRoute()).toBe(false);
    expect(TEACHING_PLANNING_COMING_SOON_CARDS).toEqual([]);
    expect(TEACHING_PLANNING_IMPLEMENTED_HREFS).toContain(
      '/admin/teaching-planning/reference-jathathas',
    );
    expect(TEACHING_PLANNING_IMPLEMENTED_HREFS).toContain(
      '/admin/teaching-planning/teacher-jathathas',
    );
    expect(TEACHING_PLANNING_IMPLEMENTED_HREFS).toContain(
      '/admin/teaching-planning/actual-deliveries',
    );
    expect(TEACHING_PLANNING_IMPLEMENTED_HREFS).toContain(
      '/admin/teaching-planning/class-journal',
    );
    expect(TEACHING_PLANNING_IMPLEMENTED_HREFS).toContain('/admin/teaching-planning/progress');
    const hubHrefs = TEACHING_PLANNING_HUB_CARDS.map((card) => card.href);
    expect(hubHrefs).toContain('/admin/teaching-planning/reference-jathathas');
    expect(hubHrefs).toContain('/admin/teaching-planning/teacher-jathathas');
    expect(hubHrefs).toContain('/admin/teaching-planning/actual-deliveries');
    expect(hubHrefs).toContain('/admin/teaching-planning/class-journal');
    expect(hubHrefs).toContain('/admin/teaching-planning/progress');
  });

  it('documents the non-negotiable semantic distinctions', () => {
    const text = readFileSync(
      join(
        process.cwd(),
        'src/features/admin/teaching-planning/utils/teaching-planning-present.ts',
      ),
      'utf8',
    );
    // Annual Distribution ≠ timetable.
    expect(text).toContain('Annual Distribution ≠ timetable');
    expect(text).toContain('never creates timetable slots');
    // Didactic Sequence ≠ Jathatha.
    expect(text).toContain('Didactic Sequence ≠ Jathatha');
    // Instructional Item ≠ Calendar Marker.
    expect(text).toContain('Instructional Item ≠ Calendar Marker');
    // Offering ↔ assignment: never a parallel assignment.
    expect(text).toContain('never creates a parallel assignment');
    expect(text).toContain('filterAssignmentCandidatesForOffering');
  });

  it('preserves instructional/calendar kind discrimination in the normalizer', () => {
    const text = readFileSync(
      join(
        process.cwd(),
        'src/features/admin/teaching-planning/utils/normalize-didactic-distribution.ts',
      ),
      'utf8',
    );
    expect(text).toContain("kind: 'instructional_item'");
    expect(text).toContain("kind: 'calendar_marker'");
  });

  it('distinguishes timeline kinds by icon + text + badge, not colour alone', () => {
    const text = readFileSync(
      join(
        process.cwd(),
        'src/features/admin/teaching-planning/components/distribution-timeline.tsx',
      ),
      'utf8',
    );
    expect(text).toContain('instructional_item');
    // Kind modifier class is derived per entry (icon + layout), not colour alone.
    expect(text).toContain('tp-timeline__item--');
    expect(text).toMatch(/'instructional'\s*:\s*'marker'/);
    // A Badge (text label) and an icon are rendered per entry.
    expect(text).toMatch(/<Badge/);
    expect(text).toContain('tp-timeline__icon');
  });

  it('reads readiness from the backend rather than inventing it locally', () => {
    const text = readFileSync(
      join(
        process.cwd(),
        'src/features/admin/teaching-planning/utils/normalize-didactic-distribution.ts',
      ),
      'utf8',
    );
    // Distribution normalizers must not synthesise readiness booleans.
    expect(text).not.toMatch(/ready\s*=\s*(true|false)/);
  });
});
