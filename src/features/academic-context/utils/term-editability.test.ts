import { describe, expect, it } from 'vitest';
import { canShowEditAcademicTerm } from '@/features/academic-context/utils/term-editability';
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

  it('hides edit when allowed_actions.edit=false', () => {
    expect(
      canShowEditAcademicTerm(
        term({ id: 1, name: 'T1', state: 'draft', allowed_actions: { edit: false } }),
        true,
      ),
    ).toBe(false);
  });

  it('hides edit for active even with manage', () => {
    expect(
      canShowEditAcademicTerm(
        term({ id: 1, name: 'T1', state: 'active', allowed_actions: { edit: false } }),
        true,
      ),
    ).toBe(false);
  });

  it('hides edit for completed', () => {
    expect(
      canShowEditAcademicTerm(
        term({ id: 1, name: 'T1', state: 'completed', allowed_actions: { edit: false } }),
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

  it('temporary draft fallback requires capability and ignores active/completed', () => {
    expect(
      canShowEditAcademicTerm(term({ id: 1, name: 'T1', state: 'draft' }), true),
    ).toBe(true);
    expect(
      canShowEditAcademicTerm(term({ id: 1, name: 'T1', state: 'draft' }), false),
    ).toBe(false);
    expect(
      canShowEditAcademicTerm(term({ id: 1, name: 'T1', state: 'active' }), true),
    ).toBe(false);
    expect(
      canShowEditAcademicTerm(term({ id: 1, name: 'T1', state: 'completed' }), true),
    ).toBe(false);
  });

  it('explicit edit=false overrides draft fallback', () => {
    expect(
      canShowEditAcademicTerm(
        term({ id: 1, name: 'T1', state: 'draft', allowed_actions: { edit: false } }),
        true,
      ),
    ).toBe(false);
  });
});
