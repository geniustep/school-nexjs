import { describe, expect, it } from 'vitest';
import type { CurrentUser } from '@/types/user';
import {
  buildStudentSpotlightDidYouMeanLabel,
  canOpenStudentSpotlightMessage,
  canOpenStudentSpotlightPayment,
  canOpenStudentSpotlightProfile,
  getStudentSpotlightShortcutAction,
  isStudentSpotlightCloseKey,
  isStudentSpotlightOpenShortcut,
  moveSpotlightActiveIndex,
  splitStudentSpotlightDidYouMeanLabel,
  studentSpotlightAcademicLine,
  studentSpotlightArabicName,
  studentSpotlightIdentityTitle,
  studentSpotlightLatinName,
  studentSpotlightMatchedOnLabelKey,
  studentSpotlightMessagePath,
  studentSpotlightNavigatePath,
  studentSpotlightPaymentPath,
} from './student-spotlight-utils';

function admin(permissions: string[]): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: 'a@test.ma',
    role: 'admin',
    admin_kind: 'admin_staff',
    school: { id: 3, name: 'School' },
    permissions: permissions as CurrentUser['permissions'],
  } as CurrentUser;
}

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

describe('studentSpotlight action paths', () => {
  it('builds payment and message routes with studentId only', () => {
    expect(studentSpotlightPaymentPath(2081)).toBe(
      '/admin/finance/collections/new?studentId=2081',
    );
    expect(studentSpotlightMessagePath(2081)).toBe(
      '/admin/channels/compose?studentId=2081',
    );
    expect(studentSpotlightMessagePath(2081)).not.toMatch(/phone|email|name/i);
  });
});

describe('studentSpotlight identity helpers', () => {
  it('uses stored Arabic and Latin names without transliteration', () => {
    expect(
      studentSpotlightArabicName({
        name_ar: 'أحمد مصطفى',
        name: 'should-not-win',
      }),
    ).toBe('أحمد مصطفى');
    expect(studentSpotlightLatinName({ name_latin: 'Ahmed Mostafa' })).toBe('Ahmed Mostafa');
    expect(
      studentSpotlightIdentityTitle({
        name_ar: 'أحمد مصطفى',
        name_latin: 'Ahmed Mostafa',
      }),
    ).toBe('أحمد مصطفى — Ahmed Mostafa');
  });

  it('omits dash when Latin name is missing', () => {
    expect(studentSpotlightLatinName({ name_latin: '  ' })).toBeNull();
    expect(studentSpotlightIdentityTitle({ name_ar: 'يوسف', name_latin: null })).toBe('يوسف');
    expect(studentSpotlightIdentityTitle({ name_ar: 'يوسف', name_latin: null })).not.toContain('—');
  });
});

describe('studentSpotlightAcademicLine', () => {
  it('joins level, class, and code without broken separators', () => {
    expect(
      studentSpotlightAcademicLine({
        level: { id: 1, name: 'CM1' },
        class: { id: 2, name: 'P4A' },
        code: 'STU-00124',
      }),
    ).toBe('CM1 · P4A · STU-00124');
  });

  it('omits missing parts without double separators', () => {
    expect(
      studentSpotlightAcademicLine({
        level: { id: 1, name: 'CM1' },
        class: null,
        code: 'STU-00124',
      }),
    ).toBe('CM1 · STU-00124');
    expect(
      studentSpotlightAcademicLine({
        level: null,
        class: null,
        code: null,
      }),
    ).toBe('');
  });
});

describe('studentSpotlight action capabilities', () => {
  it('gates profile, payment, and message without network calls', () => {
    expect(canOpenStudentSpotlightProfile(admin(['view_students']))).toBe(true);
    expect(canOpenStudentSpotlightProfile(admin([]))).toBe(false);
    expect(canOpenStudentSpotlightPayment(admin(['finance.collect_payments']))).toBe(true);
    expect(canOpenStudentSpotlightPayment(admin(['view_students']))).toBe(false);
    expect(canOpenStudentSpotlightMessage(admin(['view_channels']))).toBe(true);
    expect(canOpenStudentSpotlightMessage(admin(['view_students']))).toBe(false);
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
    expect(studentSpotlightMatchedOnLabelKey('guardian_identity')).toBe(
      'admin.spotlight.matchedOn.guardian_identity',
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
