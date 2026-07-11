import { describe, expect, it } from 'vitest';
import {
  resolveStudentsServiceCountTone,
  studentsServiceCountToneClass,
} from './students-service-count-tones';

describe('students service count tones', () => {
  it('maps known codes without using localized names', () => {
    expect(resolveStudentsServiceCountTone('TRANSPORT')).toBe('blue');
    expect(resolveStudentsServiceCountTone('REGISTRATION')).toBe('violet');
    expect(resolveStudentsServiceCountTone('TUITION')).toBe('green');
    expect(resolveStudentsServiceCountTone('CANTEEN')).toBe('orange');
  });

  it('falls back by index for unknown codes', () => {
    expect(resolveStudentsServiceCountTone(null, 0)).toBe('blue');
    expect(resolveStudentsServiceCountTone('UNKNOWN', 3)).toBe('teal');
  });

  it('builds tone class names', () => {
    expect(studentsServiceCountToneClass('blue')).toBe(
      'students-service-counts__card--tone-blue',
    );
  });
});
