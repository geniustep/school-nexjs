import { describe, expect, it } from 'vitest';
import {
  channelComposeHref,
  parseChannelComposeStudentId,
} from './parse-channel-compose-student-id';

describe('parseChannelComposeStudentId', () => {
  it('accepts a valid positive studentId', () => {
    expect(parseChannelComposeStudentId(new URLSearchParams('studentId=2081'))).toEqual({
      ok: true,
      studentId: 2081,
    });
  });

  it('rejects missing studentId without calling for API data', () => {
    expect(parseChannelComposeStudentId(new URLSearchParams(''))).toEqual({
      ok: false,
      reason: 'missing',
    });
  });

  it('rejects non-numeric text', () => {
    expect(parseChannelComposeStudentId(new URLSearchParams('studentId=abc'))).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects zero', () => {
    expect(parseChannelComposeStudentId(new URLSearchParams('studentId=0'))).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects negative values', () => {
    expect(parseChannelComposeStudentId(new URLSearchParams('studentId=-12'))).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects conflicting multi values', () => {
    const params = new URLSearchParams();
    params.append('studentId', '1');
    params.append('studentId', '2');
    expect(parseChannelComposeStudentId(params)).toEqual({
      ok: false,
      reason: 'conflicting',
    });
  });

  it('accepts repeated identical values', () => {
    const params = new URLSearchParams();
    params.append('studentId', '9');
    params.append('studentId', '9');
    expect(parseChannelComposeStudentId(params)).toEqual({
      ok: true,
      studentId: 9,
    });
  });

  it('does not accept student_id alias in the frontend URL', () => {
    expect(parseChannelComposeStudentId(new URLSearchParams('student_id=2081'))).toEqual({
      ok: false,
      reason: 'missing',
    });
  });

  it('builds compose href with studentId only', () => {
    expect(channelComposeHref(42)).toBe('/admin/channels/compose?studentId=42');
    expect(channelComposeHref(42)).not.toMatch(/phone|email|name/i);
  });
});
