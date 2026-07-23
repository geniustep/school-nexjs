import { describe, expect, it } from 'vitest';
import {
  canEditAcademicTermDates,
  canEditAcademicTermIdentity,
  canShowEditAcademicTerm,
} from '@/features/academic-context/utils/term-editability';
import type { AcademicTermOption } from '@/types/academic-context';

function term(partial: Partial<AcademicTermOption> & Pick<AcademicTermOption, 'id' | 'name'>): AcademicTermOption {
  return {
    code: 'T1',
    date_start: '2026-09-01',
    date_end: '2027-01-15',
    ...partial,
  };
}

describe('canShowEditAcademicTerm', () => {
  it('shows edit when manage + allowed_actions.edit=true', () => {
    expect(
      canShowEditAcademicTerm(
        term({ id: 1, name: 'T1', state: 'draft', allowed_actions: { edit: true } }),
        true,
      ),
    ).toBe(true);
  });

  it('shows edit for confirmed term with edit_dates', () => {
    expect(
      canShowEditAcademicTerm(
        term({
          id: 1,
          name: 'T1',
          state: 'active',
          allowed_actions: { edit: true, edit_dates: true, edit_identity: false },
        }),
        true,
      ),
    ).toBe(true);
  });

  it('hides edit when allowed_actions.edit=false and no edit_dates', () => {
    expect(
      canShowEditAcademicTerm(
        term({ id: 1, name: 'T1', state: 'draft', allowed_actions: { edit: false } }),
        true,
      ),
    ).toBe(false);
  });

  it('hides edit for done/completed', () => {
    expect(
      canShowEditAcademicTerm(
        term({ id: 1, name: 'T1', state: 'done', allowed_actions: { edit: false } }),
        true,
      ),
    ).toBe(false);
  });

  it('hides edit without manage capability', () => {
    expect(
      canShowEditAcademicTerm(
        term({ id: 1, name: 'T1', state: 'draft', allowed_actions: { edit: true } }),
        false,
      ),
    ).toBe(false);
  });

  it('fallback allows draft and active when allowed_actions omitted', () => {
    expect(
      canShowEditAcademicTerm(term({ id: 1, name: 'T1', state: 'draft' }), true),
    ).toBe(true);
    expect(
      canShowEditAcademicTerm(term({ id: 1, name: 'T1', state: 'active' }), true),
    ).toBe(true);
    expect(
      canShowEditAcademicTerm(term({ id: 1, name: 'T1', state: 'done' }), true),
    ).toBe(false);
  });
});

describe('identity vs dates gates', () => {
  it('locks identity on confirmed terms', () => {
    const active = term({
      id: 2,
      name: 'T2',
      state: 'active',
      allowed_actions: { edit: true, edit_dates: true, edit_identity: false },
    });
    expect(canEditAcademicTermIdentity(active)).toBe(false);
    expect(canEditAcademicTermDates(active)).toBe(true);
  });

  it('allows identity on draft', () => {
    const draft = term({
      id: 3,
      name: 'T3',
      state: 'draft',
      allowed_actions: { edit: true, edit_dates: true, edit_identity: true },
    });
    expect(canEditAcademicTermIdentity(draft)).toBe(true);
    expect(canEditAcademicTermDates(draft)).toBe(true);
  });
});
