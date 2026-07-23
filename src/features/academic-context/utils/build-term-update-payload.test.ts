import { describe, expect, it } from 'vitest';
import {
  buildTermUpdatePayload,
  validateTermEditForm,
} from '@/features/academic-context/utils/build-term-update-payload';
import type { AcademicTermOption } from '@/types/academic-context';

const original: AcademicTermOption = {
  id: 31,
  name: 'الدورة الأولى',
  code: 'T1',
  date_start: '2026-09-01',
  date_end: '2027-01-15',
  state: 'draft',
};

describe('validateTermEditForm', () => {
  it('rejects empty name after trim', () => {
    expect(
      validateTermEditForm({
        name: '   ',
        code: 'T1',
        date_start: '2026-09-01',
        date_end: '2027-01-15',
      }),
    ).toBe('name_required');
  });

  it('rejects empty code after trim', () => {
    expect(
      validateTermEditForm({
        name: 'Term',
        code: '  ',
        date_start: '2026-09-01',
        date_end: '2027-01-15',
      }),
    ).toBe('code_required');
  });

  it('rejects missing start date', () => {
    expect(
      validateTermEditForm({
        name: 'Term',
        code: 'T1',
        date_start: '',
        date_end: '2027-01-15',
      }),
    ).toBe('date_start_required');
  });

  it('rejects missing end date', () => {
    expect(
      validateTermEditForm({
        name: 'Term',
        code: 'T1',
        date_start: '2026-09-01',
        date_end: '',
      }),
    ).toBe('date_end_required');
  });

  it('rejects start after end', () => {
    expect(
      validateTermEditForm({
        name: 'Term',
        code: 'T1',
        date_start: '2027-02-01',
        date_end: '2027-01-15',
      }),
    ).toBe('dates_invalid');
  });

  it('rejects equal dates', () => {
    expect(
      validateTermEditForm({
        name: 'Term',
        code: 'T1',
        date_start: '2026-09-01',
        date_end: '2026-09-01',
      }),
    ).toBe('dates_invalid');
  });

  it('skips identity requirement when requireIdentity=false', () => {
    expect(
      validateTermEditForm(
        {
          name: '',
          code: '',
          date_start: '2026-09-01',
          date_end: '2027-01-15',
        },
        { requireIdentity: false },
      ),
    ).toBeNull();
  });
});

describe('buildTermUpdatePayload', () => {
  it('returns only changed allowed fields', () => {
    expect(
      buildTermUpdatePayload(original, {
        name: 'دورة محدثة',
        code: 'T1',
        date_start: '2026-09-01',
        date_end: '2027-01-15',
      }),
    ).toEqual({ name: 'دورة محدثة' });
  });

  it('returns null when nothing changed', () => {
    expect(
      buildTermUpdatePayload(original, {
        name: 'الدورة الأولى',
        code: 'T1',
        date_start: '2026-09-01',
        date_end: '2027-01-15',
      }),
    ).toBeNull();
  });

  it('omits identity fields when includeIdentity=false', () => {
    expect(
      buildTermUpdatePayload(
        original,
        {
          name: 'اسم مختلف',
          code: 'ZZ',
          date_start: '2026-09-10',
          date_end: '2027-01-15',
        },
        { includeIdentity: false },
      ),
    ).toEqual({ date_start: '2026-09-10' });
  });

  it('never includes state, school_id, academic_year_id, or active', () => {
    const payload = buildTermUpdatePayload(original, {
      name: 'New',
      code: 'TX',
      date_start: '2026-09-02',
      date_end: '2027-01-16',
    });
    expect(payload).toEqual({
      name: 'New',
      code: 'TX',
      date_start: '2026-09-02',
      date_end: '2027-01-16',
    });
    expect(payload).not.toHaveProperty('state');
    expect(payload).not.toHaveProperty('school_id');
    expect(payload).not.toHaveProperty('academic_year_id');
    expect(payload).not.toHaveProperty('active');
  });
});
