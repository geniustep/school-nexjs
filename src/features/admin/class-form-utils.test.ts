import { describe, expect, it } from 'vitest';
import { buildClassPayload } from './class-form-utils';

const base = {
  name: '3APIC-1',
  levelId: '3',
  trackId: '',
  academicYearId: '1',
  capacity: '30',
  room: 'A1',
  teacherIds: [] as number[],
  subjectIds: [10, 11] as number[],
};

describe('buildClassPayload subject_ids contract', () => {
  it('omits subject_ids when capacity-only edit (subjects not touched)', () => {
    const payload = buildClassPayload({
      ...base,
      subjectsTouched: false,
      creating: false,
    });
    expect(payload).not.toHaveProperty('subject_ids');
    expect(payload.capacity).toBe(30);
  });

  it('omits subject_ids when open/close without subject edits', () => {
    const payload = buildClassPayload({
      ...base,
      creating: false,
    });
    expect(payload).not.toHaveProperty('subject_ids');
  });

  it('sends subject_ids when user removes a subject', () => {
    const payload = buildClassPayload({
      ...base,
      subjectIds: [10],
      subjectsTouched: true,
      creating: false,
    });
    expect(payload.subject_ids).toEqual([10]);
  });

  it('sends operational subject id when user adds a subject', () => {
    const payload = buildClassPayload({
      ...base,
      subjectIds: [10, 11, 501],
      subjectsTouched: true,
      creating: false,
    });
    expect(payload.subject_ids).toEqual([10, 11, 501]);
  });

  it('sends empty subject_ids explicitly when user clears all after touch', () => {
    const payload = buildClassPayload({
      ...base,
      subjectIds: [],
      subjectsTouched: true,
      creating: false,
    });
    expect(payload.subject_ids).toEqual([]);
  });

  it('does not auto-include subjects on create unless touched', () => {
    const payload = buildClassPayload({
      ...base,
      subjectIds: [10],
      creating: true,
    });
    expect(payload).not.toHaveProperty('subject_ids');
    expect(payload.active).toBe(true);
  });
});
