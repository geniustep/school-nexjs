import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('Teacher Jathatha routes and UX boundaries', () => {
  const pages = [
    'src/app/admin/teaching-planning/reference-jathathas/page.tsx',
    'src/app/admin/teaching-planning/reference-jathathas/[id]/page.tsx',
    'src/app/admin/teaching-planning/teacher-jathathas/page.tsx',
    'src/app/admin/teaching-planning/teacher-jathathas/[id]/page.tsx',
    'src/app/teacher/sessions/[id]/page.tsx',
    'src/app/teacher/jathathas/[id]/page.tsx',
  ];

  it('ships the planned administration and teacher pages', () => {
    pages.forEach((path) => expect(existsSync(resolve(root, path)), path).toBe(true));
  });

  it('wires teacher pages to their session hub and Jathatha editor', () => {
    expect(source('src/app/teacher/sessions/[id]/page.tsx')).toContain('<TeacherSessionHub occurrenceId={id} />');
    expect(source('src/app/teacher/jathathas/[id]/page.tsx')).toContain('<TeacherJathathaEditor jathathaId={id} />');
  });

  it('exposes today sessions on the teacher dashboard and week sessions as a preview', () => {
    const dashboard = source('src/app/teacher/dashboard/page.tsx');
    const timetable = source('src/app/teacher/timetable/page.tsx');
    expect(dashboard).toContain('TeacherTodaySessions');
    expect(timetable).toContain('TeacherWeekSessions');
    expect(timetable).toContain("t('teacher.jathatha.weeklySlotPreview')");
    expect(timetable).toContain("t('teacher.jathatha.weeklySlotPreviewDescription')");
  });

  it('keeps Jathatha editor/context distinct from delivery mutation surfaces', () => {
    const jathathaOnly = [
      'jathatha-context-step.tsx',
      'teacher-jathatha-editor.tsx',
    ].map((name) => source(`src/features/teacher/jathatha/components/${name}`)).join('\n');
    expect(jathathaOnly).not.toMatch(/createActualDelivery|actual-deliveries/i);
    expect(jathathaOnly).not.toMatch(/class-journal|teaching-progress/i);
    // Session Hub may deep-link delivery as a SEPARATE tab module.
    const hub = source('src/features/teacher/jathatha/components/teacher-session-hub.tsx');
    expect(hub).toContain('DeliveryContextStep');
    expect(hub).toContain('/teacher/attendance');
    expect(hub).toContain('/teacher/classes/');
    expect(hub).not.toMatch(/createHomework|submitAttendance/);
  });

  it('ships delivery / journal / progress teacher routes as separate pages', () => {
    [
      'src/app/teacher/actual-deliveries/[id]/page.tsx',
      'src/app/teacher/class-journal/page.tsx',
      'src/app/teacher/class-journal/[id]/page.tsx',
      'src/app/teacher/teaching-progress/page.tsx',
      'src/app/teacher/teaching-progress/[id]/page.tsx',
      'src/app/admin/teaching-planning/actual-deliveries/page.tsx',
      'src/app/admin/teaching-planning/class-journal/page.tsx',
      'src/app/admin/teaching-planning/progress/page.tsx',
    ].forEach((path) => expect(existsSync(resolve(root, path)), path).toBe(true));
  });

  it('documents the Jathatha semantic guards in its public contract', () => {
    const types = source('src/types/jathatha.ts');
    expect(types).toContain('Teacher Jathatha ≠ Actual Delivery Record');
    expect(types).toContain('Teacher Jathatha ≠ Class Teaching Journal');
    expect(types).toContain('Session Occurrence ≠ Weekly Slot');
  });
});
