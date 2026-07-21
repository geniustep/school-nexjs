import { describe, expect, it } from 'vitest';
import type { Level, SchoolClass, Subject } from '@/types/class';
import {
  buildLevelSubjectsRows,
  summarizeLevelSubjects,
} from './level-subjects-overview';

const level = (id: number, name: string, subjects: Subject[] = []): Level =>
  ({
    id,
    name,
    code: `L${id}`,
    subjects,
  }) as Level;

const cls = (id: number, levelId: number, subjectIds: number[]): SchoolClass =>
  ({
    id,
    name: `C${id}`,
    level: { id: levelId, name: `L${levelId}` },
    subjects: subjectIds.map((sid) => ({ id: sid, name: `S${sid}` })),
  }) as SchoolClass;

const subject = (id: number, name: string): Subject =>
  ({ id, name }) as Subject;

describe('buildLevelSubjectsRows', () => {
  it('marks levels without subjects as needing enable', () => {
    const rows = buildLevelSubjectsRows(
      [level(1, 'P1'), level(2, 'P2')],
      [cls(10, 1, [100])],
      [subject(100, 'Math')],
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].needsEnable).toBe(false);
    expect(rows[0].subjects.map((s) => s.id)).toEqual([100]);
    expect(rows[1].needsEnable).toBe(true);
    expect(rows[1].subjects).toEqual([]);
  });

  it('falls back to level.subjects when class subjects are empty', () => {
    const rows = buildLevelSubjectsRows(
      [level(1, 'P1', [subject(7, 'Arabic')])],
      [],
      [],
    );
    expect(rows[0].needsEnable).toBe(false);
    expect(rows[0].subjects[0]?.id).toBe(7);
  });
});

describe('summarizeLevelSubjects', () => {
  it('counts pending and ready levels', () => {
    const summary = summarizeLevelSubjects(
      buildLevelSubjectsRows(
        [level(1, 'P1'), level(2, 'P2'), level(3, 'P3')],
        [cls(1, 1, [1]), cls(2, 2, [2])],
        [subject(1, 'A'), subject(2, 'B')],
      ),
    );
    expect(summary.readyLevels).toBe(2);
    expect(summary.pendingLevels).toBe(1);
    expect(summary.firstPendingId).toBe(3);
    expect(summary.subjectCount).toBe(2);
  });
});
