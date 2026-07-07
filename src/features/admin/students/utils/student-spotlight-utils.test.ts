import { describe, expect, it } from 'vitest';
import {
  buildStudentSpotlightDidYouMeanLabel,
  getStudentSpotlightShortcutAction,
  isStudentSpotlightCloseKey,
  isStudentSpotlightOpenShortcut,
  moveSpotlightActiveIndex,
  splitStudentSpotlightDidYouMeanLabel,
  studentSpotlightMatchedOnLabelKey,
  studentSpotlightNavigatePath,
} from './student-spotlight-utils';

describe('isStudentSpotlightOpenShortcut', () => {
  it('opens on Ctrl+K using physical KeyK code', () => {
    expect(isStudentSpotlightOpenShortcut({ code: 'KeyK', ctrlKey: true })).toBe(true);
  });

  it('opens on Cmd+K using physical KeyK code', () => {
    expect(isStudentSpotlightOpenShortcut({ code: 'KeyK', metaKey: true })).toBe(true);
  });

  it('opens on Ctrl+K with Arabic keyboard layout key label', () => {
    expect(isStudentSpotlightOpenShortcut({ code: 'KeyK', ctrlKey: true })).toBe(true);
  });

  it('does not open on Cmd+Space or plain KeyK', () => {
    expect(isStudentSpotlightOpenShortcut({ code: 'Space', metaKey: true })).toBe(false);
    expect(isStudentSpotlightOpenShortcut({ code: 'KeyK' })).toBe(false);
  });

  it('ignores shortcuts while composing text', () => {
    expect(
      isStudentSpotlightOpenShortcut({ code: 'KeyK', ctrlKey: true, isComposing: true }),
    ).toBe(false);
    expect(
      isStudentSpotlightOpenShortcut({ code: 'KeyK', metaKey: true, isComposing: true }),
    ).toBe(false);
  });
});

describe('getStudentSpotlightShortcutAction', () => {
  it('opens when spotlight is closed', () => {
    expect(getStudentSpotlightShortcutAction(false)).toBe('open');
  });

  it('refocuses input when spotlight is already open', () => {
    expect(getStudentSpotlightShortcutAction(true)).toBe('refocus');
  });
});

describe('isStudentSpotlightCloseKey', () => {
  it('closes on Escape', () => {
    expect(isStudentSpotlightCloseKey('Escape')).toBe(true);
    expect(isStudentSpotlightCloseKey('Enter')).toBe(false);
  });
});

describe('moveSpotlightActiveIndex', () => {
  it('moves down and wraps', () => {
    expect(moveSpotlightActiveIndex(-1, 3, 'down')).toBe(0);
    expect(moveSpotlightActiveIndex(0, 3, 'down')).toBe(1);
    expect(moveSpotlightActiveIndex(2, 3, 'down')).toBe(0);
  });

  it('moves up and wraps', () => {
    expect(moveSpotlightActiveIndex(-1, 3, 'up')).toBe(2);
    expect(moveSpotlightActiveIndex(1, 3, 'up')).toBe(0);
    expect(moveSpotlightActiveIndex(0, 3, 'up')).toBe(2);
  });

  it('returns -1 when there are no results', () => {
    expect(moveSpotlightActiveIndex(0, 0, 'down')).toBe(-1);
  });
});

describe('studentSpotlightNavigatePath', () => {
  it('builds the student 360 path for Enter navigation', () => {
    expect(studentSpotlightNavigatePath(42)).toBe('/admin/students/42');
  });
});

describe('studentSpotlightMatchedOnLabelKey', () => {
  it('maps matched_on values to i18n keys', () => {
    expect(studentSpotlightMatchedOnLabelKey('name')).toBe('admin.spotlight.matchedOn.name');
    expect(studentSpotlightMatchedOnLabelKey('guardian_phone')).toBe(
      'admin.spotlight.matchedOn.guardian_phone',
    );
    expect(studentSpotlightMatchedOnLabelKey('massar')).toBe('admin.spotlight.matchedOn.massar');
    expect(studentSpotlightMatchedOnLabelKey('student_code')).toBe(
      'admin.spotlight.matchedOn.student_code',
    );
    expect(studentSpotlightMatchedOnLabelKey(undefined)).toBeNull();
  });
});

describe('splitStudentSpotlightDidYouMeanLabel', () => {
  it('splits a did-you-mean label around the query marker', () => {
    expect(splitStudentSpotlightDidYouMeanLabel('هل تقصد: \u0000؟')).toEqual({
      before: 'هل تقصد: ',
      after: '؟',
    });
  });
});

describe('buildStudentSpotlightDidYouMeanLabel', () => {
  it('builds before/after parts from the translated did-you-mean label', () => {
    const parts = buildStudentSpotlightDidYouMeanLabel((key, params) => {
      expect(key).toBe('admin.spotlight.didYouMean');
      expect(params?.query).toBe('\u0000');
      return 'Did you mean: \u0000?';
    });

    expect(parts).toEqual({
      before: 'Did you mean: ',
      after: '?',
    });
  });
});
