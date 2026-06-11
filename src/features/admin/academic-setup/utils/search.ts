import type { Level, SchoolClass, Subject } from '@/types/class';
import type { StaffMember } from '@/types/academic-setup';
import type { AcademicTrack } from '@/types/academic-setup';
import type { Teacher } from '@/types/teacher';
import type { GlobalSearchResult } from '../types';

export type SearchEntityType =
  | 'level'
  | 'class'
  | 'subject'
  | 'teacher'
  | 'staff'
  | 'track';

export function globalSetupSearch(
  query: string,
  levels: Level[],
  classes: SchoolClass[],
  subjects: Subject[],
  teachers: Teacher[],
  staff: StaffMember[] = [],
  tracks: AcademicTrack[] = [],
): GlobalSearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const results: GlobalSearchResult[] = [];

  for (const level of levels) {
    if (level.name.toLowerCase().includes(q) || level.code?.toLowerCase().includes(q)) {
      results.push({
        id: `level-${level.id}`,
        type: 'level',
        entityId: level.id,
        label: level.name,
        hint: level.code ?? undefined,
        href: '/admin/settings/academic-setup/classes',
        query: { level: String(level.id) },
      });
    }
  }

  for (const cls of classes) {
    if (cls.name.toLowerCase().includes(q) || cls.code?.toLowerCase().includes(q)) {
      results.push({
        id: `class-${cls.id}`,
        type: 'class',
        entityId: cls.id,
        label: cls.name,
        hint: cls.level?.name ?? undefined,
        href: '/admin/settings/academic-setup/classes',
        query: { class_id: String(cls.id) },
      });
    }
  }

  for (const subject of subjects) {
    if (subject.name.toLowerCase().includes(q) || subject.code?.toLowerCase().includes(q)) {
      results.push({
        id: `subject-${subject.id}`,
        type: 'subject',
        entityId: subject.id,
        label: subject.name,
        href: '/admin/settings/academic-setup/subjects',
        query: { subject_id: String(subject.id) },
      });
    }
  }

  for (const track of tracks) {
    if (track.name.toLowerCase().includes(q) || track.code.toLowerCase().includes(q)) {
      results.push({
        id: `track-${track.id}`,
        type: 'track',
        entityId: track.id,
        label: track.name,
        hint: track.level.name,
        href: '/admin/settings/academic-setup/subjects',
        query: { tab: 'tracks', id: String(track.id) },
      });
    }
  }

  for (const teacher of teachers) {
    if (
      teacher.name.toLowerCase().includes(q) ||
      teacher.code?.toLowerCase().includes(q) ||
      teacher.email?.toLowerCase().includes(q)
    ) {
      results.push({
        id: `teacher-${teacher.id}`,
        type: 'teacher',
        entityId: teacher.id,
        label: teacher.name,
        hint: teacher.subjects?.map((s) => s.name).join(', ') || undefined,
        href: '/admin/settings/academic-setup/teachers',
        query: { teacher_id: String(teacher.id) },
      });
    }
  }

  for (const member of staff) {
    if (
      member.name.toLowerCase().includes(q) ||
      member.email?.toLowerCase().includes(q) ||
      member.job_title?.toLowerCase().includes(q)
    ) {
      results.push({
        id: `staff-${member.id}`,
        type: 'staff',
        entityId: member.id,
        label: member.name,
        hint: member.job_title ?? undefined,
        href: '/admin/settings/academic-setup/staff',
        query: { id: String(member.id) },
      });
    }
  }

  return results.slice(0, 20);
}

export function buildHref(base: string, query?: Record<string, string>): string {
  if (!query || !Object.keys(query).length) return base;
  const params = new URLSearchParams(query);
  return `${base}?${params.toString()}`;
}

export function parseFilterParam(
  searchParams: URLSearchParams | null,
  key: string,
): string | null {
  if (!searchParams) return null;
  const v = searchParams.get(key);
  return v?.trim() || null;
}

export function parseNumericFilter(
  searchParams: URLSearchParams | null,
  key: string,
): number | null {
  const raw = parseFilterParam(searchParams, key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
