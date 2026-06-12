import type { LevelLinkedItems, LinkedTrack, SchoolLevelUsage } from '@/types/academic-levels';
import type { Level } from '@/types/class';

function normalizeLinkedTrack(raw: unknown): LinkedTrack | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const id = Number(item.id);
  if (!Number.isFinite(id)) return null;
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  if (!name) return null;
  return {
    id,
    name,
    active: item.active == null ? undefined : Boolean(item.active),
  };
}

export function normalizeLevelLinkedItems(raw: unknown): LevelLinkedItems | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const tracksRaw = source.tracks;
  if (!Array.isArray(tracksRaw)) return undefined;
  const tracks = tracksRaw
    .map(normalizeLinkedTrack)
    .filter((track): track is LinkedTrack => track != null);
  return tracks.length ? { tracks } : { tracks: [] };
}

function normalizeUsage(raw: SchoolLevelUsage | undefined): SchoolLevelUsage | undefined {
  if (!raw) return undefined;
  return {
    classes: raw.classes ?? 0,
    subjects: raw.subjects ?? 0,
    tracks: raw.tracks ?? 0,
    students: raw.students ?? 0,
    enrollments: raw.enrollments ?? 0,
    assignments: raw.assignments ?? 0,
    timetable_slots: raw.timetable_slots ?? 0,
    exams: raw.exams ?? 0,
  };
}

export function resolveTracksCount(level: Pick<Level, 'tracks_count' | 'usage'>): number | null {
  if (typeof level.tracks_count === 'number' && Number.isFinite(level.tracks_count)) {
    return level.tracks_count;
  }
  if (level.usage && typeof level.usage.tracks === 'number' && Number.isFinite(level.usage.tracks)) {
    return level.usage.tracks;
  }
  return null;
}

export function normalizeLevel(raw: Level): Level {
  const tracks_count =
    typeof raw.tracks_count === 'number' && Number.isFinite(raw.tracks_count)
      ? raw.tracks_count
      : undefined;

  return {
    ...raw,
    tracks_count,
    usage: normalizeUsage(raw.usage),
    linked_items: raw.linked_items ? normalizeLevelLinkedItems(raw.linked_items) : undefined,
  };
}
