import { describe, expect, it } from 'vitest';
import { resolveFamilyNextDuePresentation } from './resolve-family-next-due-presentation';

describe('resolveFamilyNextDuePresentation', () => {
  const children = [
    { student_id: 101, student_name: 'Current Child' },
    { student_id: 202, student_name: 'Sibling Child' },
  ];

  it('attributes family next due to another child without blaming current student', () => {
    const result = resolveFamilyNextDuePresentation({
      currentStudentId: 101,
      next_due_scope: 'family',
      next_due_student_id: 202,
      next_due_date: '2026-07-14',
      next_due_amount: 1800,
      children,
    });

    expect(result.show).toBe(true);
    expect(result.isFamilyScope).toBe(true);
    expect(result.attribution).toBe('other_family_student');
    expect(result.attributedStudentName).toBe('Sibling Child');
    expect(result.nextDueAmount).toBe(1800);
    expect(result.nextDueDate).toBe('2026-07-14');
  });

  it('attributes family next due to the current student when ids match', () => {
    const result = resolveFamilyNextDuePresentation({
      currentStudentId: 101,
      next_due_scope: 'family',
      next_due_student_id: 101,
      next_due_date: '2026-08-01',
      next_due_amount: 700,
      children,
    });

    expect(result.attribution).toBe('current_student');
    expect(result.attributedStudentName).toBe('Current Child');
  });

  it('uses a safe attribution when the child name is not in the payload', () => {
    const result = resolveFamilyNextDuePresentation({
      currentStudentId: 101,
      next_due_scope: 'family',
      next_due_student_id: 303,
      next_due_date: '2026-07-14',
      next_due_amount: 1800,
      children,
    });

    expect(result.attribution).toBe('other_family_student');
    expect(result.attributedStudentName).toBeNull();
  });

  it('hides when next-due fields are absent', () => {
    expect(
      resolveFamilyNextDuePresentation({
        currentStudentId: 101,
        children,
      }).show,
    ).toBe(false);
  });
});
